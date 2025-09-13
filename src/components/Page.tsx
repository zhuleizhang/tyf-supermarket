import { cn } from '@/lib/utils';
import React from 'react';

export const Page: React.FC<
	React.PropsWithChildren<{ className?: string }>
> = ({ children, className }) => {
	return (
		<div className={cn('p-4 bg-white rounded-lg shadow', className)}>
			{children}
		</div>
	);
};
export default Page;
