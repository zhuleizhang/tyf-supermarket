/* eslint-disable @typescript-eslint/no-explicit-any */

import {
	Product,
	Category,
	Order,
	OrderItem,
	clearCategoryCache,
} from './index';
import { categoryService, productService, orderService } from './index';
import {
	productsStore,
	ordersStore,
	orderItemsStore,
	categoriesStore,
} from './index';

// 定义备份数据的类型
interface BackupData {
	version: string;
	exportTime: string;
	categories: Category[];
	products: Product[];
	orders: Order[];
	orderItems: OrderItem[];
}

// 导出所有数据到JSON文件
export const exportData = async (): Promise<void> => {
	try {
		// 获取所有数据
		const categories = await categoryService.getAll();
		const productsResult = await productService.getAll();
		const products = productsResult.list;
		const orders = await orderService.getAllOrders();
		const orderItems = await orderService.getAllOrderItems();
		console.log(products, 'products');
		// 创建备份数据对象
		const backupData: BackupData = {
			version: '1.0',
			exportTime: new Date().toLocaleString(),
			categories,
			products,
			orders,
			orderItems,
		};
		console.log(backupData, 'backupData');

		// 转换为JSON字符串
		const jsonString = JSON.stringify(backupData, null, 2);

		// 创建Blob对象
		const blob = new Blob([jsonString], { type: 'application/json' });

		// 创建下载链接
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `supermarket_backup_${new Date().toLocaleString()}.json`;
		document.body.appendChild(link);

		// 触发下载
		link.click();

		// 清理
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('导出数据失败:', error);
		throw new Error('导出数据失败，请重试');
	}
};

// 从JSON文件导入数据
export const importData = async (file: File): Promise<void> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = async (event) => {
			try {
				if (!event.target?.result) {
					throw new Error('文件读取失败');
				}

				// 解析JSON数据
				const backupData: BackupData = JSON.parse(
					event.target.result as string
				);

				// 验证数据格式
				if (!validateBackupData(backupData)) {
					throw new Error('无效的备份文件格式');
				}

				// 清空现有数据
				await clearAllData();

				// 在导入前检查是否需要初始化数据
				// 注意：只有在开发环境且没有导入数据时才需要初始化
				// 由于我们已经清空了数据，这里不需要额外初始化
				console.log(backupData, 'backupData');

				// 按顺序导入数据（分类->商品->订单->订单项）
				await importCategories(backupData.categories);
				await importProducts(backupData.products);
				await importOrders(backupData.orders);
				await importOrderItems(backupData.orderItems);

				resolve();
			} catch (error) {
				console.error('导入数据失败:', error);
				reject(
					new Error(
						`导入数据失败: ${
							error instanceof Error ? error.message : '未知错误'
						}`
					)
				);
			}
		};

		reader.onerror = () => {
			reject(new Error('文件读取错误'));
		};

		reader.readAsText(file);
	});
};

// 验证备份数据格式
const validateBackupData = (data: any): boolean => {
	return (
		data &&
		typeof data.version === 'string' &&
		typeof data.exportTime === 'string' &&
		Array.isArray(data.categories) &&
		Array.isArray(data.products) &&
		Array.isArray(data.orders) &&
		Array.isArray(data.orderItems)
	);
};

// 清空所有数据
const clearAllData = async (): Promise<void> => {
	try {
		console.log('开始直接清除所有localforage存储实例的数据...');

		// 直接清除所有localforage存储实例的数据
		clearCategoryCache();
		await productsStore.clear();
		await ordersStore.clear();
		await orderItemsStore.clear();
		await categoriesStore.clear();

		// 清除localStorage中的初始化标记，以便重新初始化
		// localStorage.removeItem('dataInitialized');

		console.log('所有数据已成功清除');
	} catch (error) {
		console.error('清空数据失败:', error);
		throw error;
	}
};

// 导入分类数据
const importCategories = async (categories: Category[]): Promise<void> => {
	for (const category of categories) {
		try {
			await categoryService.recover(category);
		} catch (error) {
			console.error('导入分类失败:', error);
			// 继续导入其他分类，不中断整个过程
		}
	}
};

// 导入商品数据
const importProducts = async (products: Product[]): Promise<void> => {
	for (const product of products) {
		try {
			// 由于add方法不接受id参数，我们需要创建一个新的商品对象
			// 并且需要处理分类ID可能不存在的情况
			await productService.recover(product);
		} catch (error) {
			console.error('导入商品失败:', error);
			// 继续导入其他商品，不中断整个过程
		}
	}
};

// 导入订单数据
const importOrders = async (orders: Order[]): Promise<void> => {
	for (const order of orders) {
		try {
			await orderService.recoverOrder(order);
		} catch (error) {
			console.error('导入订单失败:', error);
		}
	}
};

// 导入订单项数据
const importOrderItems = async (orderItems: OrderItem[]): Promise<void> => {
	for (const orderItem of orderItems) {
		try {
			await orderService.recoverOrderItem(orderItem);
		} catch (error) {
			console.error('导入订单项失败:', error);
		}
	}
};
