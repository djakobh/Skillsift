export default function AccountDetailsPage() {
  
  const user = { name: "Username", email: "yourmail@example.com" };

  return (
    <>
      <h1 className="text-3xl font-bold text-center mb-6">Account Details</h1>
      <ProfileSection />
      <AccountForm user={user} />
    </>
  );
}

function ProfileSection() {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="w-28 h-28 rounded-full border border-gray-500 text-gray-700 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-14 h-14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 17a4 4 0 10-8 0m8 0a4 4 0 00-8 0m8 0H8m4-8a4 4 0 110-8 4 4 0 010 8z"
          />
        </svg>
      </div>

      <button className="mt-4 px-4 py-1 bg-orange-400 text-white text-sm font-medium rounded-full hover:bg-orange-500">
        Change Picture
      </button>
    </div>
  );
}

function AccountForm({ user }: { user: { name: string; email: string } }) {
  return (
    <form className="space-y-6">
      {/* Row 1 
        FirstName & LastName 
      */}
      <div className="grid grid-cols-2 gap-4">
        <InputField label="First Name" placeholder="Alex" />
        <InputField label="Last Name" placeholder="Dos" />
      </div>

      {/* Row 2 
        Username & Password
      */}
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Username" placeholder={user.name} />
        <InputField label="Password" type="password" placeholder="********" />
      </div>

      {/* Row 3 
        Email Address & Phone Number
      */}
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Email Address" placeholder={user.email} />
        <InputField label="Phone Number" placeholder="555-555-5555" />
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button className="px-6 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500">
          Save Changes
        </button>
        <button
          type="button"
          className="px-6 py-2 text-sm text-gray-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InputField({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
  );
}
