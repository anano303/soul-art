import { ProductStatus } from '@/types';
import { Badge } from './badge';

interface StatusBadgeProps {
  status: ProductStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case ProductStatus.APPROVED:
        return 'bg-green-500';
      case ProductStatus.PENDING:
        return 'bg-yellow-500';
      case ProductStatus.REJECTED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Badge className={`${getStatusColor()} text-white`}>
      {status}
    </Badge>
  );
}
