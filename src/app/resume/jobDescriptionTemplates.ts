// Author: Dylan Hartley
// Job description templates for the resume scanning page

export enum JobDescriptionTemplate {
    NONE = "",
    SOFTWARE_ENGINEER = "SOFTWARE_ENGINEER",
    DATA_SCIENTIST = "DATA_SCIENTIST",
    FRONTEND_ENGINEER = "FRONTEND_ENGINEER",
    BACKEND_ENGINEER = "BACKEND_ENGINEER",
    FULL_STACK_ENGINEER = "FULL_STACK_ENGINEER",
    DEVOPS_SRE = "DEVOPS_SRE",
    ML_ENGINEER = "ML_ENGINEER",
    CYBERSECURITY_ANALYST = "CYBERSECURITY_ANALYST",
    CLOUD_ARCHITECT = "CLOUD_ARCHITECT",
    TECHNICAL_PRODUCT_MANAGER = "TECHNICAL_PRODUCT_MANAGER",
}

export const JOB_DESCRIPTION_LABELS: Record<JobDescriptionTemplate, string> = {
    [JobDescriptionTemplate.NONE]: "None",
    [JobDescriptionTemplate.SOFTWARE_ENGINEER]: "Software Engineer",
    [JobDescriptionTemplate.DATA_SCIENTIST]: "Data Scientist",
    [JobDescriptionTemplate.FRONTEND_ENGINEER]: "Frontend Engineer",
    [JobDescriptionTemplate.BACKEND_ENGINEER]: "Backend Engineer",
    [JobDescriptionTemplate.FULL_STACK_ENGINEER]: "Full Stack Engineer",
    [JobDescriptionTemplate.DEVOPS_SRE]: "DevOps / Site Reliability Engineer",
    [JobDescriptionTemplate.ML_ENGINEER]: "Machine Learning Engineer",
    [JobDescriptionTemplate.CYBERSECURITY_ANALYST]: "Cybersecurity Analyst",
    [JobDescriptionTemplate.CLOUD_ARCHITECT]: "Cloud Solutions Architect",
    [JobDescriptionTemplate.TECHNICAL_PRODUCT_MANAGER]: "Technical Product Manager",
};

export const JOB_DESCRIPTION_TEMPLATES: Record<JobDescriptionTemplate, string> = {

    [JobDescriptionTemplate.NONE]: "",

    [JobDescriptionTemplate.SOFTWARE_ENGINEER]: `Software Engineer

We are looking for a skilled Software Engineer to join our engineering team and help build scalable, reliable software systems. You will work closely with cross-functional teams to design, develop, test, and deploy high-quality features across our product suite.

Responsibilities:
- Design and implement new features and improvements to existing systems
- Write clean, maintainable, and well-tested code
- Participate in code reviews and contribute to engineering best practices
- Collaborate with product managers, designers, and other engineers
- Debug production issues and contribute to incident response
- Contribute to architectural decisions and technical roadmaps

Requirements:
- 2+ years of professional software engineering experience
- Proficiency in one or more languages such as Python, Java, Go, or C++
- Experience with RESTful API design and development
- Familiarity with relational and/or NoSQL databases (e.g., PostgreSQL, MongoDB)
- Understanding of software development lifecycle, CI/CD, and version control (Git)
- Strong problem-solving skills and attention to detail

Nice to Have:
- Experience with cloud platforms (AWS, GCP, or Azure)
- Knowledge of containerization and orchestration (Docker, Kubernetes)
- Contributions to open-source projects`,

    [JobDescriptionTemplate.DATA_SCIENTIST]: `Data Scientist

We are seeking a Data Scientist to join our analytics team and drive data-informed decision making across the organization. You will work with large, complex datasets to uncover insights, build predictive models, and communicate findings to both technical and non-technical stakeholders.

Responsibilities:
- Collect, clean, and analyze large datasets to identify trends and insights
- Build and deploy machine learning models to solve business problems
- Design and analyze A/B tests and experiments
- Collaborate with engineering teams to integrate models into production pipelines
- Create data visualizations and reports for stakeholders
- Define metrics and KPIs in partnership with product and business teams

Requirements:
- 2+ years of experience in data science or a related field
- Proficiency in Python or R, with experience using libraries such as pandas, NumPy, and scikit-learn
- Strong understanding of statistics, probability, and experimental design
- Experience with SQL and working with relational databases
- Familiarity with data visualization tools (Tableau, Matplotlib, Seaborn, etc.)
- Excellent written and verbal communication skills

Nice to Have:
- Experience with deep learning frameworks (TensorFlow, PyTorch)
- Exposure to big data tools (Spark, Hadoop, BigQuery)
- Familiarity with MLflow or other model lifecycle management tools`,

    [JobDescriptionTemplate.FRONTEND_ENGINEER]: `Frontend Engineer

We are looking for a Frontend Engineer to build fast, accessible, and visually polished user interfaces. You will work in close collaboration with designers and backend engineers to deliver exceptional user experiences across web platforms.

Responsibilities:
- Build and maintain responsive, accessible UI components using modern frameworks
- Translate design mockups and wireframes into pixel-perfect implementations
- Optimize application performance, load times, and rendering efficiency
- Write unit and integration tests for frontend code
- Collaborate with backend engineers to integrate APIs and manage application state
- Participate in design reviews and provide technical feasibility feedback

Requirements:
- 2+ years of professional frontend development experience
- Strong proficiency in React and TypeScript
- Deep understanding of HTML5, CSS3, and responsive design principles
- Experience with state management (Redux, Zustand, or Context API)
- Familiarity with build tools such as Webpack, Vite, or Next.js
- Understanding of browser performance, accessibility (WCAG), and cross-browser compatibility

Nice to Have:
- Experience with testing frameworks (Jest, React Testing Library, Cypress)
- Familiarity with design systems or component libraries (Storybook, Tailwind CSS)
- Exposure to GraphQL or REST API integration`,

    [JobDescriptionTemplate.BACKEND_ENGINEER]: `Backend Engineer

We are hiring a Backend Engineer to design and build the systems, APIs, and data pipelines that power our products. You will take ownership of backend services and work across the stack to deliver reliable, scalable infrastructure.

Responsibilities:
- Design, develop, and maintain backend services and RESTful or GraphQL APIs
- Work with relational and NoSQL databases to optimize queries and schemas
- Build and maintain data processing pipelines and background job systems
- Ensure backend services meet performance, security, and reliability standards
- Participate in on-call rotations and contribute to incident postmortems
- Collaborate with frontend engineers, data teams, and product stakeholders

Requirements:
- 2+ years of backend engineering experience
- Proficiency in one or more backend languages (Node.js, Python, Go, Java, or Ruby)
- Strong understanding of RESTful API design principles
- Experience with relational databases (PostgreSQL, MySQL) and query optimization
- Familiarity with caching strategies (Redis, Memcached) and message queues
- Knowledge of authentication and authorization patterns (OAuth2, JWT)

Nice to Have:
- Experience with microservices architecture and event-driven systems
- Exposure to cloud infrastructure (AWS Lambda, GCP Cloud Run, etc.)
- Familiarity with containerization (Docker, Kubernetes)`,

    [JobDescriptionTemplate.FULL_STACK_ENGINEER]: `Full Stack Engineer

We are looking for a Full Stack Engineer who is comfortable working across both frontend and backend systems. You will own features end-to-end, from database design to user interface, and collaborate across multiple teams to deliver complete product experiences.

Responsibilities:
- Build full-featured product capabilities across frontend and backend layers
- Design and implement REST APIs and integrate them with UI components
- Work with databases to design schemas, write queries, and manage migrations
- Ensure end-to-end quality through testing at all layers of the stack
- Collaborate with product, design, and infrastructure teams
- Identify and resolve performance bottlenecks across the full application stack

Requirements:
- 2+ years of professional full stack development experience
- Proficiency in a frontend framework (React, Vue, or Angular) and a backend language (Node.js, Python, or Go)
- Experience with both SQL and NoSQL databases
- Understanding of RESTful API design and client-server communication
- Familiarity with Git, CI/CD pipelines, and modern deployment workflows
- Ability to own and ship features independently from concept to production

Nice to Have:
- Experience with Next.js or similar full-stack frameworks
- Exposure to cloud services (AWS, GCP, or Azure)
- Knowledge of containerization and basic DevOps practices`,

    [JobDescriptionTemplate.DEVOPS_SRE]: `DevOps / Site Reliability Engineer

We are seeking a DevOps or Site Reliability Engineer to help us build and maintain resilient, scalable infrastructure. You will work to automate operations, improve system reliability, and ensure our platforms are highly available and performant.

Responsibilities:
- Design, deploy, and manage cloud infrastructure using infrastructure-as-code tools
- Build and maintain CI/CD pipelines to streamline deployment workflows
- Monitor system health, define SLOs/SLAs, and lead incident response
- Identify and eliminate toil through automation and tooling improvements
- Collaborate with development teams to improve deployment frequency and reliability
- Manage Kubernetes clusters, container registries, and service meshes

Requirements:
- 2+ years of experience in DevOps, SRE, or infrastructure engineering
- Proficiency with cloud platforms (AWS, GCP, or Azure)
- Experience with infrastructure-as-code tools (Terraform, Pulumi, or CloudFormation)
- Strong knowledge of Kubernetes and container orchestration
- Familiarity with CI/CD platforms (GitHub Actions, Jenkins, CircleCI, etc.)
- Experience with observability tools (Prometheus, Grafana, Datadog, or similar)

Nice to Have:
- Experience with service mesh technologies (Istio, Linkerd)
- Knowledge of security best practices in cloud environments
- Familiarity with chaos engineering principles`,

    [JobDescriptionTemplate.ML_ENGINEER]: `Machine Learning Engineer

We are looking for a Machine Learning Engineer to bridge the gap between research and production. You will work alongside data scientists and software engineers to build, deploy, and maintain machine learning systems at scale.

Responsibilities:
- Implement and optimize machine learning models for production deployment
- Build and maintain scalable ML pipelines and training infrastructure
- Collaborate with data scientists to translate model prototypes into robust services
- Monitor deployed models for performance drift and data quality issues
- Design feature engineering pipelines and manage feature stores
- Contribute to internal ML tooling, libraries, and best practices

Requirements:
- 2+ years of experience in machine learning engineering or a closely related field
- Strong proficiency in Python and ML frameworks such as PyTorch or TensorFlow
- Experience with MLOps tooling (MLflow, Kubeflow, SageMaker, or similar)
- Familiarity with data pipelines and workflow orchestration (Airflow, Prefect, etc.)
- Understanding of model evaluation, A/B testing, and performance metrics
- Solid software engineering fundamentals: testing, version control, code review

Nice to Have:
- Experience with large language models or generative AI systems
- Knowledge of distributed training techniques
- Familiarity with real-time inference and model serving frameworks (Triton, TorchServe)`,

    [JobDescriptionTemplate.CYBERSECURITY_ANALYST]: `Cybersecurity Analyst

We are seeking a Cybersecurity Analyst to protect our organization's systems, networks, and data from threats. You will monitor for suspicious activity, conduct vulnerability assessments, and respond to security incidents to maintain a strong security posture.

Responsibilities:
- Monitor security events and alerts using SIEM platforms and threat intelligence tools
- Investigate and respond to security incidents, conducting root cause analysis
- Perform regular vulnerability scans and penetration tests across systems and applications
- Develop and maintain security policies, procedures, and documentation
- Collaborate with IT and engineering teams to remediate identified vulnerabilities
- Stay current on emerging threats, CVEs, and industry best practices

Requirements:
- 2+ years of experience in cybersecurity, information security, or a related field
- Proficiency with SIEM tools (Splunk, Microsoft Sentinel, or similar)
- Knowledge of networking fundamentals (TCP/IP, DNS, firewalls, VPNs)
- Familiarity with frameworks such as NIST CSF, MITRE ATT&CK, and CIS Controls
- Experience with vulnerability assessment tools (Nessus, Qualys, or similar)
- Understanding of incident response lifecycle and digital forensics basics

Nice to Have:
- Certifications such as CompTIA Security+, CEH, CISSP, or OSCP
- Experience with cloud security (AWS Security Hub, Azure Defender, etc.)
- Familiarity with scripting for automation (Python, Bash, or PowerShell)`,

    [JobDescriptionTemplate.CLOUD_ARCHITECT]: `Cloud Solutions Architect

We are looking for a Cloud Solutions Architect to lead the design and implementation of our cloud infrastructure strategy. You will work across engineering, security, and business teams to ensure our cloud environments are scalable, secure, cost-efficient, and aligned with organizational goals.

Responsibilities:
- Design and document cloud architectures for new and existing systems
- Lead cloud migration efforts and ensure smooth transitions from on-premise environments
- Define and enforce cloud governance, security, and cost management policies
- Evaluate and recommend cloud services, tools, and vendors
- Provide technical guidance to engineering teams on cloud best practices
- Collaborate with security and compliance teams to meet regulatory requirements

Requirements:
- 4+ years of experience architecting cloud solutions on AWS, GCP, or Azure
- Deep understanding of cloud networking, IAM, storage, and compute services
- Experience with infrastructure-as-code (Terraform, CloudFormation, or Bicep)
- Strong knowledge of cloud security principles and shared responsibility models
- Familiarity with cost optimization strategies and FinOps practices
- Excellent communication skills to convey complex technical concepts to stakeholders

Nice to Have:
- Professional-level cloud certifications (AWS Solutions Architect Professional, GCP Professional Cloud Architect, etc.)
- Experience with multi-cloud or hybrid cloud environments
- Familiarity with containerization and Kubernetes in cloud contexts`,

    [JobDescriptionTemplate.TECHNICAL_PRODUCT_MANAGER]: `Technical Product Manager

We are looking for a Technical Product Manager to lead the development of complex, technology-driven products. You will work at the intersection of business strategy, user needs, and engineering execution to define and deliver high-impact product experiences.

Responsibilities:
- Define product vision, strategy, and roadmap in collaboration with engineering and business stakeholders
- Write detailed product requirements, user stories, and acceptance criteria
- Prioritize features and manage the product backlog in alignment with business goals
- Partner closely with engineering teams throughout the development lifecycle
- Conduct user research and synthesize feedback to inform product decisions
- Track product metrics and use data to evaluate feature success and guide iteration

Requirements:
- 3+ years of product management experience, preferably with a technical product or platform
- Ability to understand and discuss technical concepts with engineering teams
- Experience with agile methodologies and tools (Jira, Confluence, Linear, etc.)
- Strong analytical skills with experience using data to make decisions
- Excellent communication and stakeholder management skills
- Bachelor's degree in Computer Science, Engineering, or equivalent practical experience

Nice to Have:
- Prior experience as a software engineer or technical background
- Familiarity with API products, developer tools, or infrastructure platforms
- Experience with product analytics tools (Mixpanel, Amplitude, Looker, etc.)`,
};
