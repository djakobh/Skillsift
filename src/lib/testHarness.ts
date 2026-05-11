//Alvin - test harness builder: appends a Python test runner to the user's Solution class,
// then parses the test_case_output: lines back into TestResult objects for the judge API.

// TODO add C++ testing
// only Python for now

export interface TestCase {
  input: Record<string, unknown>;
  expectedOutput: unknown; // string or number in the JSON
  isHidden: boolean;
}

export interface Param {
  name: string;
  type: string;
}

export interface QuestionMeta {
  functionName: string;
  params: Param[];
  outputType: string;
}

export interface TestResult {
  case: number;
  passed: boolean;
  actual?: string;
  expected: string;
  error?: string;
  isHidden: boolean;
}

// Converts the expected answer into a consistent string format so we can compare it to the user's output.
// For 2D array problems like 3Sum, order doesn't matter so we sort everything first.
export function normalizeExpected(expected: unknown, outputType: string): string {
  // If expected is a JSON string (e.g. "[[-1,0,1]]"), parse it into an actual value first
  let value: unknown;
  if (typeof expected === "string") {
    try {
      value = JSON.parse(expected);
    } catch {
      value = expected;
    }
  } else {
    value = expected;
  }

  // For 2D arrays: sort each inner array, then sort the outer array
  // Example: [[-1,0,1],[-1,-1,2]] becomes [[-1,-1,2],[-1,0,1]] so order doesn't affect the result
  if (outputType === "int_array_2d" && Array.isArray(value)) {
    const sorted = (value as number[][])
      .map((inner) => [...inner].sort((a, b) => a - b))
      .sort((a, b) => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (a[i] !== b[i]) return (a[i] ?? 0) - (b[i] ?? 0);
        }
        return a.length - b.length;
      });
    return JSON.stringify(sorted);
  }

  return JSON.stringify(value);
}

// Reads the Docker container's stdout line by line and converts each test_case_output:/test_case_error:
// line into a TestResult showing whether that test case passed or failed.
export function parseTestOutput(
  stdout: string,
  testCases: TestCase[],
  outputType: string
): TestResult[] {
  // Only keep lines that our test runner printed — ignore any print() calls from the user's code
  const testResultLines = stdout
    .split("\n")
    .filter((l) => l.startsWith("test_case_output:") || l.startsWith("test_case_error:"));

  // Match each line to its test case by position (line 1 = case 1, line 2 = case 2, etc.)
  return testCases.map((tc, i) => {
    const line = testResultLines[i];
    const normalizedExpected = normalizeExpected(tc.expectedOutput, outputType);
    const rawExpected =
      typeof tc.expectedOutput === "string"
        ? tc.expectedOutput
        : JSON.stringify(tc.expectedOutput);

    // No output line means the program crashed before reaching this test case
    if (!line) {
      return {
        case: i + 1,
        passed: false,
        error: "No output (crash or timeout before this case)",
        expected: rawExpected,
        isHidden: tc.isHidden,
      };
    }

    // The user's code threw an exception on this test case
    if (line.startsWith("test_case_error:")) {
      return {
        case: i + 1,
        passed: false,
        error: line.slice("test_case_error:".length),
        expected: rawExpected,
        isHidden: tc.isHidden,
      };
    }

    // Normal result — strip the prefix, then compare normalized actual vs normalized expected
    const actual = line.slice("test_case_output:".length).trim();
    const normalizedActual = normalizeExpected(actual, outputType);
    const passed = normalizedActual === normalizedExpected;

    return {
      case: i + 1,
      passed,
      actual,
      expected: rawExpected,
      isHidden: tc.isHidden,
    };
  });
}

// Glues the user's Solution class together with a test runner and returns it as one Python script.
// The test runner calls the user's function with each test case input and prints the result.
export function buildPythonHarness(
  userCode: string,
  meta: QuestionMeta,
  testCases: TestCase[]
): string {
  // Embed the test cases from the JSON file directly into the Python script as a string
  const testCasesJson = JSON.stringify(testCases).replace(/"""/g, '\\"\\"\\"');

  const hasTreeNodeParam = meta.params.some((p) => p.type === "tree_node");
  const hasTreeNodeOutput = meta.outputType === "tree_node";
  const hasListNodeParam = meta.params.some((p) => p.type === "list_node" || p.type === "list_node_array");
  const hasListNodeOutput = meta.outputType === "list_node";


  // For 2D array problems, sort the output before comparing (same logic as normalizeExpected above)
  // For everything else, return the value as-is
  const normalizeFunction =
    meta.outputType === "int_array_2d"
      ? `
def normalize_output(val):
    if isinstance(val, list):
        return sorted([sorted(x) if isinstance(x, list) else [x] for x in val])
    return val`
      : `
def normalize_output(val):
    return val`;

  // Inject TreeNode class + build/serialize helpers when the question uses tree nodes
  const treeHelpers =
    hasTreeNodeParam || hasTreeNodeOutput
      ? `
# TreeNode (injected — skipped if the user already defined it)
try:
    TreeNode  # noqa: F821
except NameError:
    class TreeNode:
        def __init__(self, val=0, left=None, right=None):
            self.val = val
            self.left = left
            self.right = right

def _build_tree(nodes):
    if not nodes:
        return None
    root = TreeNode(nodes[0])
    queue = [root]
    i = 1
    while queue and i < len(nodes):
        node = queue.pop(0)
        if i < len(nodes) and nodes[i] is not None:
            node.left = TreeNode(nodes[i])
            queue.append(node.left)
        i += 1
        if i < len(nodes) and nodes[i] is not None:
            node.right = TreeNode(nodes[i])
            queue.append(node.right)
        i += 1
    return root

def _serialize_tree(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result
`
      : "";

  // Inject ListNode class + build/serialize helpers when the question uses linked list nodes
  const listHelpers =
    hasListNodeParam || hasListNodeOutput
      ? `
# ListNode (injected — skipped if the user already defined it)
try:
    ListNode  # noqa: F821
except NameError:
    class ListNode:
        def __init__(self, val=0, next=None):
            self.val = val
            self.next = next

def _build_list(nodes, pos=-1):
    if not nodes:
        return None
    head = ListNode(nodes[0])
    curr = head
    node_list = [head]
    for val in nodes[1:]:
        curr.next = ListNode(val)
        curr = curr.next
        node_list.append(curr)
    if 0 <= pos < len(node_list):
        curr.next = node_list[pos]
    return head

def _serialize_list(head):
    result = []
    visited = set()
    curr = head
    while curr and id(curr) not in visited:
        visited.add(id(curr))
        result.append(curr.val)
        curr = curr.next
    return result
`
      : "";

  // For each tree_node param, emit a line that converts the raw list to a TreeNode before calling
  const treeInputConversions = meta.params
    .filter((p) => p.type === "tree_node")
    .map((p) => `        test_case["input"]["${p.name}"] = _build_tree(test_case["input"]["${p.name}"])`)
    .join("\n");

  // For list_node / list_node_array params, convert raw arrays to linked lists.
  // Also pop "pos" from input (used by linked-list-cycle to create a cycle at that index).
  const listInputConversions = (() => {
    if (!hasListNodeParam) return "";
    const lines: string[] = [];
    lines.push(`        _cycle_pos = test_case["input"].pop("pos", -1)`);
    let firstListNode = true;
    for (const p of meta.params) {
      if (p.type === "list_node") {
        const posArg = firstListNode ? ", _cycle_pos" : "";
        lines.push(`        test_case["input"]["${p.name}"] = _build_list(test_case["input"]["${p.name}"]${posArg})`);
        firstListNode = false;
      } else if (p.type === "list_node_array") {
        lines.push(`        test_case["input"]["${p.name}"] = [_build_list(l) for l in test_case["input"]["${p.name}"]]`);
      }
    }
    return lines.join("\n");
  })();

  const inputConversions = [treeInputConversions, listInputConversions].filter(Boolean).join("\n");

  // Serialize tree/list output back to an array so it can be compared to the expected JSON array
  const outputLine = hasTreeNodeOutput
    ? `        normalized_output = _serialize_tree(actual_output)`
    : hasListNodeOutput
    ? `        normalized_output = _serialize_list(actual_output)`
    : `        normalized_output = normalize_output(actual_output)`;


  // Build the final Python script: user's code + test runner appended at the bottom
  return `${userCode}

# ---- Test Runner (injected, do not modify) ----
import json as _json
${treeHelpers}
${listHelpers}
${normalizeFunction}

solution = Solution()
test_cases = _json.loads("""${testCasesJson}""")

for test_case in test_cases:
    try:
${inputConversions ? inputConversions + "\n" : ""}        actual_output = solution.${meta.functionName}(**test_case["input"])
${outputLine}
        print("test_case_output:" + _json.dumps(normalized_output, separators=(',', ':')))
    except Exception as error:
        print("test_case_error:" + str(error))
`;
}
