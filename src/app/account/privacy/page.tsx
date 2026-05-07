import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex-shrink-0">
          <Shield className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h3 className="m-0 text-gray-900">Privacy</h3>
          <p className="text-xs text-gray-400 m-0 mt-0.5">Manage your information and control how your data is used.</p>
        </div>
      </div>

      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium text-gray-800 m-0">Email notifications</p>
              <p className="text-xs text-gray-400 m-0">Receive updates about your account activity.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
            />
            <div>
              <p className="text-sm font-medium text-gray-800 m-0">Usage analytics</p>
              <p className="text-xs text-gray-400 m-0">Help us improve SkillSift by sharing anonymous usage data.</p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
          <button type="button" className="btn-ghost btn-sm">Cancel</button>
          <button type="submit" className="btn-primary btn-sm">Save Privacy Settings</button>
        </div>
      </form>
    </>
  );
}
