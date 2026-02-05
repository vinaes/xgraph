import { memo } from 'react';
import { useValidationStore } from '@/store/useValidationStore';
import { getNodeValidationStatus } from '@/utils/validation';

function ValidationBadge({ nodeId }: { nodeId: string }) {
  const result = useValidationStore((s) => s.result);
  const status = getNodeValidationStatus(nodeId, result);

  if (status.level === 'valid') {
    return (
      <span
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-600 border-2 border-green-400 flex items-center justify-center text-[10px] text-white"
        title="Valid"
      >
        ✓
      </span>
    );
  }

  if (status.level === 'warning') {
    return (
      <span
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-600 border-2 border-yellow-400 flex items-center justify-center text-[10px] text-white font-bold"
        title={`${status.count} warning(s)`}
      >
        !
      </span>
    );
  }

  return (
    <span
      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 border-2 border-red-400 flex items-center justify-center text-[10px] text-white font-bold"
      title={`${status.count} error(s)`}
    >
      ✕
    </span>
  );
}

export default memo(ValidationBadge);
