import { productService } from './index';
import { isProduction } from '../config';

// 初始商品数据
const initialProducts = [
	{
		name: '矿泉水500ml',
		barcode: '6901234567890',
		price: 2.0,
		stock: 100,
		category: '饮料',
		unit: '瓶',
	},
	{
		name: '可口可乐330ml',
		barcode: '6901234567891',
		price: 3.0,
		stock: 80,
		category: '饮料',
		unit: '罐',
	},
	{
		name: '康师傅红烧牛肉面',
		barcode: '6901234567892',
		price: 5.5,
		stock: 60,
		category: '方便食品',
		unit: '桶',
	},
	{
		name: '乐事薯片原味',
		barcode: '6901234567893',
		price: 4.5,
		stock: 50,
		category: '零食',
		unit: '袋',
	},
	{
		name: '农夫山泉1.5L',
		barcode: '6901234567894',
		price: 4.0,
		stock: 40,
		category: '饮料',
		unit: '瓶',
	},
	{
		name: '双汇火腿肠',
		barcode: '6901234567895',
		price: 2.5,
		stock: 70,
		category: '熟食',
		unit: '根',
	},
	{
		name: '达利园蛋黄派',
		barcode: '6901234567896',
		price: 8.0,
		stock: 30,
		category: '零食',
		unit: '盒',
	},
	{
		name: '伊利纯牛奶250ml',
		barcode: '6901234567897',
		price: 3.5,
		stock: 60,
		category: '乳制品',
		unit: '盒',
	},
	{
		name: '蓝月亮洗衣液',
		barcode: '6901234567898',
		price: 25.0,
		stock: 20,
		category: '日用品',
		unit: '瓶',
	},
	{
		name: '雕牌洗衣粉',
		barcode: '6901234567899',
		price: 15.0,
		stock: 25,
		category: '日用品',
		unit: '袋',
	},
];

// 初始化数据的函数
// 注意：此函数只在开发环境下执行
export const initializeData = async (): Promise<void> => {
	// 只在开发环境下执行初始化
	if (isProduction) {
		console.log('当前是生产环境，跳过数据初始化');
		return;
	}

	try {
		// 检查是否已经初始化过数据
		const hasInitialized = await localStorage.getItem('dataInitialized');
		if (hasInitialized) {
			console.log('数据已经初始化过，跳过初始化');
			return;
		}

		console.log('开始初始化商品数据...');

		// 批量添加初始商品
		for (const product of initialProducts) {
			// 检查商品是否已存在
			const existingProduct = await productService.getByBarcode(
				product.barcode
			);
			if (!existingProduct) {
				await productService.add(product);
			}
		}

		// 标记数据已初始化
		await localStorage.setItem('dataInitialized', 'true');
		console.log('商品数据初始化完成');
	} catch (error) {
		console.error('初始化数据失败:', error);
	}
};

// 清除所有数据的函数（用于开发和测试）
export const clearAllData = async (): Promise<void> => {
	try {
		console.log('开始清除所有数据...');

		// 获取所有商品
		const { list: products } = await productService.getAll(1, 100);

		// 删除所有商品
		for (const product of products) {
			await productService.delete(product.id);
		}

		// 清除初始化标记
		await localStorage.removeItem('dataInitialized');

		console.log('所有数据已清除');
	} catch (error) {
		console.error('清除数据失败:', error);
	}
};
