import { ProductStatus as ProductStatusType } from '@/types';
import { Badge } from './badge';

interface ProductStatusProps {
  status: ProductStatusType;
}

export function ProductStatus({ status }: ProductStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case ProductStatusType.APPROVED:
        return 'bg-green-500';
      case ProductStatusType.PENDING:
        return 'bg-yellow-500';
      case ProductStatusType.REJECTED:
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
