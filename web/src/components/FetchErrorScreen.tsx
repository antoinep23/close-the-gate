import { AiOutlineExclamationCircle, AiOutlineReload, AiOutlineLoading3Quarters } from 'react-icons/ai';

interface FetchErrorScreenProps {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}

export function FetchErrorScreen({ message, onRetry, retrying }: FetchErrorScreenProps) {
  return (
    <div className="flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-10 text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
            <AiOutlineExclamationCircle className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-xl font-medium text-gray-800 mb-1.5">Can’t reach your drive</h2>
          <p className="text-sm text-gray-500 mb-2 leading-relaxed">
            {message || 'Failed to fetch your files.'}
          </p>
          <p className="text-sm text-gray-500 mb-7 leading-relaxed">
            This usually means the backend is unreachable or your AWS credentials
            have expired. Check that the server is running and your AWS session is
            valid, then try again.
          </p>

          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying ? (
              <>
                <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <AiOutlineReload className="w-4 h-4" />
                Retry
              </>
            )}
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Your files remain safely encrypted in the cloud, this is only a
          connection issue.
        </p>
      </div>
    </div>
  );
}
