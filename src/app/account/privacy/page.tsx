export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-center mb-6">Privacy</h1>

      <p className="text-sm text-gray-600 mb-6 text-center">
        Manage your information and control how your data is used.
      </p>

        {/* Privacy settings form */}
      <form className="space-y-4">

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" />
          Allow email notifications
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" />
          Allow usage analytics
        </label>

        <div className="flex justify-center gap-4 mt-6">
          <button className="px-6 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500">
            Save Privacy Settings
          </button>
          <button
            type="button"
            className="px-6 py-2 text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
