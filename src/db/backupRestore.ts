/* eslint-disable @typescript-eslint/no-explicit-any */

import { getNowTimeString } from '@/utils';
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

		// 在Electron环境下，使用主进程提供的API来保存文件
		if (
			window.electron &&
			typeof window.electron.showBackupSaveDialog === 'function'
		) {
			// 显示保存对话框
			const filePath = await window.electron.showBackupSaveDialog({
				defaultPath: `supermarket_backup_${getNowTimeString()}.json`,
				filters: [{ name: 'JSON Files', extensions: ['json'] }],
			});
			console.log(filePath, 'exportData filepath');

			if (filePath) {
				// 写入文件
				await window.electron.writeBackupFile(filePath, jsonString);
				console.log('数据导出成功');
			} else {
				throw new Error('用户取消了导出操作');
			}
		} else {
			// 浏览器环境下的回退方案
			// 创建Blob对象
			const blob = new Blob([jsonString], { type: 'application/json' });

			// 创建下载链接
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `supermarket_backup_${new Date().toLocaleString().replace(/[:.]/g, '-')}.json`;
			document.body.appendChild(link);

			// 触发下载
			link.click();

			// 清理
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}
	} catch (error) {
		console.error('导出数据失败:', error);
		throw new Error(error.message || '导出数据失败，请重试');
	}
};

// 从JSON文件导入数据
export const importDataFromFile = async (file: File): Promise<void> => {
	try {
		// let fileContent: string;

		// 在Electron环境下，使用主进程提供的API来选择和读取文件
		// if (
		// 	window.electron &&
		// 	typeof window.electron.showBackupOpenDialog === 'function'
		// ) {
		// 	// 显示打开对话框
		// 	const filePath = await window.electron.showBackupOpenDialog({
		// 		filters: [{ name: 'JSON Files', extensions: ['json'] }],
		// 	});

		// 	if (!filePath) {
		// 		console.log('用户取消了导入操作');
		// 		throw new Error('用户取消了导入操作');
		// 	}

		// 	// 读取文件
		// 	fileContent = await window.electron.readBackupFile(filePath);
		// } else {
		// 	// 读取文件内容
		// 	fileContent = await new Promise((resolve, reject) => {
		// 		const reader = new FileReader();
		// 		reader.onload = (e) => resolve(e.target?.result as string);
		// 		reader.onerror = () => reject(new Error('文件读取错误'));
		// 		reader.readAsText(file);
		// 	});
		// }

		const fileContent = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target?.result as string);
			reader.onerror = () => reject(new Error('文件读取错误'));
			reader.readAsText(file);
		});

		// 解析JSON数据
		const backupData: BackupData = JSON.parse(fileContent as string);

		// 验证数据格式
		if (!validateBackupData(backupData)) {
			throw new Error('无效的备份文件格式');
		}

		// 清空现有数据
		await clearAllData();

		// 按顺序导入数据（分类->商品->订单->订单项）
		await importCategories(backupData.categories);
		await importProducts(backupData.products);
		await importOrders(backupData.orders);
		await importOrderItems(backupData.orderItems);
	} catch (error) {
		console.error('导入数据失败:', error);
		throw new Error(
			`导入数据失败: ${error instanceof Error ? error.message : '未知错误'}
		`
		);
	}
};

// 从JSON文件路径导入数据
export const importDataFromFilePath = async (
	filePath: string
): Promise<void> => {
	try {
		// 读取文件
		const fileContent = await window.electron.readBackupFile(filePath);

		// 解析JSON数据
		const backupData: BackupData = JSON.parse(fileContent as string);

		// 验证数据格式
		if (!validateBackupData(backupData)) {
			throw new Error('无效的备份文件格式');
		}

		// 清空现有数据
		await clearAllData();

		// 按顺序导入数据（分类->商品->订单->订单项）
		await importCategories(backupData.categories);
		await importProducts(backupData.products);
		await importOrders(backupData.orders);
		await importOrderItems(backupData.orderItems);
	} catch (error) {
		console.error('导入数据失败:', error);
		throw new Error(
			`导入数据失败: ${error instanceof Error ? error.message : '未知错误'}
		`
		);
	}
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

// 无需用户确认的自动数据导出功能
export const autoExportData = async (
	filename?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> => {
	try {
		// 获取所有数据
		const categories = await categoryService.getAll();
		const productsResult = await productService.getAll();
		const products = productsResult.list;
		const orders = await orderService.getAllOrders();
		const orderItems = await orderService.getAllOrderItems();

		// 创建备份数据对象
		const backupData: BackupData = {
			version: '1.0',
			exportTime: new Date().toLocaleString(),
			categories,
			products,
			orders,
			orderItems,
		};

		// 转换为JSON字符串
		const jsonString = JSON.stringify(backupData, null, 2);

		// 在Electron环境下，使用直接备份API
		if (
			window.electron &&
			typeof window.electron.directBackupToFile === 'function'
		) {
			const result = await window.electron.directBackupToFile(
				jsonString,
				filename
			);
			console.log('数据自动导出成功:', result.filePath);
			return { success: true, filePath: result.filePath };
		} else {
			// 在浏览器环境下，我们无法实现真正的自动导出，因为需要用户交互
			// 这里可以选择返回错误或者回退到标准导出流程
			console.log('无法在浏览器环境中执行自动导出，需要用户交互');
			return {
				success: false,
				error: '无法在当前环境中执行自动导出，需要用户交互',
			};
		}
	} catch (error) {
		console.error('自动导出数据失败:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : '未知错误',
		};
	}
};

export {};
