import { Link } from "react-router-dom";

interface ErrorPageProps {
  message?: string;
}

export default function ErrorPage({ message }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 px-6 py-12">
      
      {/* Error Icon / Symbol */}
      <div className="text-red-600 mb-8">
        <svg
          className="w-24 h-24 mx-auto"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
      </div>

      {/* Error Heading */}
      <h1 className="text-5xl font-bold text-center text-gray-900 mb-4">
        Oops!
      </h1>

      {/* Error Subheading */}
      <p className="text-xl text-center text-gray-700 mb-6 max-w-lg">
        {message || "Something went wrong while fetching the data."}
      </p>

      {/* Gradient Divider */}
      <div className="h-1 w-2/3 bg-linear-to-r from-blue-950 to-purple-950 rounded mb-8"></div>

      {/* Action Button */}
      <Link
        to="/groups"
        className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 transition"
      >
        Go Back to Groups
      </Link>
    </div>
  );
}
