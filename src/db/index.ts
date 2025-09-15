import localforage from 'localforage';
import { isProduction } from '../config';

// 数据模型类型定义
export interface Product {
	id: string;
	name: string;
	barcode: string;
	price: number;
	category_id?: string;
	unit?: string;
	createdAt: string;
	updatedAt: string;
}

export interface Category {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface OrderItem {
	id: string;
	orderId: string;
	productId: string;
	quantity: number;
	unitPrice: number;
	subtotal: number;
	createdAt: string;
}

export interface Order {
	id: string;
	totalAmount: number;
	createdAt: string;
	status: 'completed' | 'cancelled' | 'pending';
}

export interface CreateOrderData {
	items: Array<{
		productId: string;
		quantity: number;
		unitPrice: number;
		subtotal: number;
	}>;
	totalAmount: number;
}

export interface SalesStatistics {
	date: string;
	amount: number;
	count: number;
}

export interface TopProduct {
	productId: string;
	quantity: number;
	amount: number;
}

// 配置localforage
localforage.config({
	name: isProduction ? 'SupermarketPriceSystem' : 'SupermarketPriceSystemDev',
	storeName: 'supermarket_data', // 数据库默认表名
	description: '小型超市商品价格管理系统数据存储',
});

// 为不同的数据类型创建单独的存储实例
export const productsStore = localforage.createInstance({
	name: 'SupermarketPriceSystem',
	storeName: 'products',
});

export const ordersStore = localforage.createInstance({
	name: 'SupermarketPriceSystem',
	storeName: 'orders',
});

export const orderItemsStore = localforage.createInstance({
	name: 'SupermarketPriceSystem',
	storeName: 'order_items',
});

export const categoriesStore = localforage.createInstance({
	name: 'SupermarketPriceSystem',
	storeName: 'categories',
});

// 分类数据缓存
let categoryCache: { data: Category[]; lastUpdated: number } | null = null;
const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟缓存有效期

// 清除分类缓存
export const clearCategoryCache = () => {
	categoryCache = null;
};

// 导出备份恢复功能
export * from './backupRestore';

// 分类操作服务
export const categoryService = {
	// 获取所有分类
	getAll: async (): Promise<Category[]> => {
		try {
			// 检查缓存是否有效
			const now = Date.now();
			if (
				categoryCache &&
				now - categoryCache.lastUpdated < CACHE_EXPIRE_TIME
			) {
				return [...categoryCache.data];
			}

			const categories: Category[] = [];
			await categoriesStore.iterate((value) => {
				categories.push(value as Category);
			});

			// 按创建时间排序（升序）
			categories.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() -
					new Date(b.createdAt).getTime()
			);

			// 更新缓存
			categoryCache = { data: categories, lastUpdated: now };

			return categories;
		} catch (error) {
			console.error('获取分类列表失败:', error);
			return [];
		}
	},

	// 通过ID获取分类
	getById: async (id: string): Promise<Category | null> => {
		try {
			const category = (await categoriesStore.getItem(
				id
			)) as Category | null;
			return category;
		} catch (error) {
			console.error('通过ID查询分类失败:', error);
			return null;
		}
	},

	// 通过名称获取分类
	getByName: async (name: string): Promise<Category | null> => {
		try {
			let category: Category | null = null;
			await categoriesStore.iterate((value) => {
				if ((value as Category).name === name) {
					category = value as Category;
					return true; // 中断迭代
				}
			});
			return category;
		} catch (error) {
			console.error('通过名称查询分类失败:', error);
			return null;
		}
	},

	/** 恢复分类数据 */
	recover: async (category: Category): Promise<Category> => {
		try {
			// 检查分类名称是否已存在
			const existingCategory = await categoryService.getByName(
				category.name
			);
			if (existingCategory) {
				throw new Error('分类名称已存在');
			}

			await categoriesStore.setItem(category.id, category);
			// 清除缓存，下次获取时重新加载
			clearCategoryCache();
			return category;
		} catch (error) {
			console.error('添加分类失败:', error);
			throw error;
		}
	},

	// 添加分类
	add: async (
		category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Category> => {
		try {
			// 检查分类名称是否已存在
			const existingCategory = await categoryService.getByName(
				category.name
			);
			if (existingCategory) {
				throw new Error('分类名称已存在');
			}

			const now = new Date();
			const newCategory: Category = {
				...category,
				id: Date.now().toString(), // 生成唯一ID
				// 使用上海时间
				createdAt: now.toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
				updatedAt: now.toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
			};

			await categoriesStore.setItem(newCategory.id, newCategory);
			// 清除缓存，下次获取时重新加载
			clearCategoryCache();
			return newCategory;
		} catch (error) {
			console.error('添加分类失败:', error);
			throw error;
		}
	},

	// 更新分类
	update: async (
		id: string,
		categoryData: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
	): Promise<Category> => {
		try {
			const existingCategory = (await categoriesStore.getItem(
				id
			)) as Category | null;
			if (!existingCategory) {
				throw new Error('分类不存在');
			}

			// 如果更新了名称，检查新名称是否已存在
			if (
				categoryData.name &&
				categoryData.name !== existingCategory.name
			) {
				const existingByName = await categoryService.getByName(
					categoryData.name
				);
				if (existingByName) {
					throw new Error('分类名称已存在');
				}
			}

			const updatedCategory: Category = {
				...existingCategory,
				...categoryData,
				updatedAt: new Date().toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
			};

			await categoriesStore.setItem(id, updatedCategory);
			// 清除缓存，下次获取时重新加载
			clearCategoryCache();
			return updatedCategory;
		} catch (error) {
			console.error('更新分类失败:', error);
			throw error;
		}
	},

	// 删除分类
	delete: async (id: string): Promise<boolean> => {
		try {
			// 检查是否有商品使用此分类
			const products = (await productService.getAll()).list;
			const hasProducts = products.some(
				(product) => product.category_id && product.category_id === id
			);
			if (hasProducts) {
				throw new Error('该分类下还有商品，无法删除');
			}

			await categoriesStore.removeItem(id);
			// 清除缓存，下次获取时重新加载
			clearCategoryCache();
			return true;
		} catch (error) {
			console.error('删除分类失败:', error);
			throw error;
		}
	},

	// 清除分类缓存
	clearCache: clearCategoryCache,
};

// 商品操作服务
export const productService = {
	// 获取所有商品
	getAll: async (): Promise<{ list: Product[]; total: number }> => {
		try {
			// 获取所有商品数据
			const allProducts: Product[] = [];
			await productsStore.iterate((value) => {
				allProducts.push(value as Product);
			});

			// 分页处理
			const total = allProducts.length;

			return { list: allProducts, total };
		} catch (error) {
			console.error('获取商品列表失败:', error);
			return { list: [], total: 0 };
		}
	},

	/** 分页获取商品列表 */
	getProductList: async (
		page = 1,
		pageSize = 10,
		keyword = '',
		category_id = ''
	): Promise<{ list: Product[]; total: number }> => {
		try {
			// 获取所有商品数据
			let allProducts: Product[] = [];
			await productsStore.iterate((value) => {
				allProducts.push(value as Product);
			});

			// 关键词搜索
			if (keyword) {
				const lowerKeyword = keyword.toLowerCase();
				allProducts = allProducts.filter(
					(product) =>
						product.name.toLowerCase().includes(lowerKeyword) ||
						product.barcode.includes(keyword)
				);
			}

			// 分类筛选
			if (category_id) {
				allProducts = allProducts.filter(
					(product) => product.category_id === category_id
				);
			}

			// 按创建时间排序（降序）
			allProducts.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() -
					new Date(a.createdAt).getTime()
			);

			if (pageSize === Infinity) {
				pageSize = allProducts.length;
			}
			// 分页处理
			const total = allProducts.length;
			const startIndex = (page - 1) * pageSize;
			const list = allProducts.slice(startIndex, startIndex + pageSize);

			return { list, total };
		} catch (error) {
			console.error('获取商品列表失败:', error);
			return { list: [], total: 0 };
		}
	},

	// 通过条码获取商品
	getByBarcode: async (barcode: string): Promise<Product | null> => {
		try {
			let product: Product | null = null;
			await productsStore.iterate((value) => {
				if ((value as Product).barcode === barcode) {
					product = value as Product;
					return true; // 中断迭代
				}
			});
			return product;
		} catch (error) {
			console.error('通过条码查询商品失败:', error);
			return null;
		}
	},

	/** 恢复商品数据 */
	recover: async (product: Product): Promise<Product> => {
		try {
			// 验证分类ID是否存在 - 支持向后兼容
			const categoryId = product.category_id;
			if (categoryId) {
				const category = await categoryService.getById(categoryId);
				if (!category) {
					throw new Error('分类不存在');
				}
			}
			if (!product.id) {
				throw new Error('商品ID不存在');
			}
			await productsStore.setItem(product.id, product);
			return product;
		} catch (error) {
			console.error('恢复商品失败:', error);
			throw error;
		}
	},

	// 添加商品
	add: async (
		product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Product> => {
		try {
			// 验证分类ID是否存在 - 支持向后兼容
			const categoryId = product.category_id;
			if (categoryId) {
				const category = await categoryService.getById(categoryId);
				if (!category) {
					throw new Error('分类不存在');
				}
			}

			const now = new Date();
			const newProduct: Product = {
				...product,
				id: Date.now().toString(), // 生成唯一ID
				// 使用上海时间
				createdAt: now.toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
				updatedAt: now.toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
			};

			await productsStore.setItem(newProduct.id, newProduct);
			return newProduct;
		} catch (error) {
			console.error('添加商品失败:', error);
			throw error;
		}
	},

	// 更新商品
	update: async (
		id: string,
		productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
	): Promise<Product> => {
		try {
			const existingProduct = (await productsStore.getItem(
				id
			)) as Product | null;
			if (!existingProduct) {
				throw new Error('商品不存在');
			}

			// 验证分类ID是否存在 - 支持向后兼容
			const categoryId = productData.category_id;
			if (categoryId) {
				const category = await categoryService.getById(categoryId);
				if (!category) {
					throw new Error('分类不存在');
				}
			}

			const updatedProduct: Product = {
				...existingProduct,
				...productData,
				updatedAt: new Date().toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
			};

			await productsStore.setItem(id, updatedProduct);
			return updatedProduct;
		} catch (error) {
			console.error('更新商品失败:', error);
			throw error;
		}
	},

	// 删除商品
	delete: async (id: string): Promise<boolean> => {
		try {
			await productsStore.removeItem(id);
			return true;
		} catch (error) {
			console.error('删除商品失败:', error);
			return false;
		}
	},

	// 获取商品ById
	getById: async (id: string): Promise<Product | null> => {
		try {
			return (await productsStore.getItem(id)) as Product | null;
		} catch (error) {
			console.error('获取商品失败:', error);
			return null;
		}
	},
};

// 订单操作服务
export const orderService = {
	/** 恢复订单 */
	recoverOrder: async (orderData: Order): Promise<Order> => {
		try {
			await ordersStore.setItem(orderData.id, orderData);
			return orderData;
		} catch (error) {
			console.error('恢复订单失败:', error);
			throw error;
		}
	},

	/** 恢复订单项 */
	recoverOrderItem: async (orderItem: OrderItem): Promise<OrderItem> => {
		try {
			await orderItemsStore.setItem(orderItem.id, orderItem);
			return orderItem;
		} catch (error) {
			console.error('恢复订单项失败:', error);
			throw error;
		}
	},

	// 创建订单
	create: async (
		orderData: CreateOrderData
	): Promise<{ orderId: string; createdAt: Date }> => {
		try {
			const now = new Date();
			const orderId = Date.now().toString(); // 生成唯一订单ID

			const createdAt = now.toLocaleString('zh-CN', {
				timeZone: 'Asia/Shanghai',
			});

			// 创建订单
			const order: Order = {
				id: orderId,
				totalAmount: orderData.totalAmount,
				createdAt: createdAt,
				status: 'completed',
			};

			await ordersStore.setItem(orderId, order);

			// 创建订单商品
			const orderItems: OrderItem[] = orderData.items.map((item) => ({
				id: `${orderId}_${item.productId}_${Date.now()}`,
				orderId,
				productId: item.productId,
				quantity: item.quantity,
				unitPrice: item.unitPrice,
				subtotal: item.subtotal,
				createdAt: createdAt,
			}));

			// 保存所有订单项
			for (const item of orderItems) {
				await orderItemsStore.setItem(item.id, item);
			}

			return { orderId, createdAt: now };
		} catch (error) {
			console.error('创建订单失败:', error);
			throw error;
		}
	},

	// 获取销售统计
	getSalesStatistics: async (
		startDate: string,
		endDate: string,
		interval: 'day' | 'week' | 'month' = 'day'
	): Promise<SalesStatistics[]> => {
		try {
			// 获取所有订单
			const allOrders: Order[] = [];
			await ordersStore.iterate((value) => {
				allOrders.push(value as Order);
			});

			// 按日期筛选订单
			const filteredOrders = allOrders.filter((order) => {
				const orderDate = new Date(order.createdAt);
				return (
					orderDate >= new Date(startDate) &&
					orderDate <= new Date(endDate)
				);
			});

			// 按时间间隔分组统计
			const statisticsMap = new Map<string, SalesStatistics>();

			filteredOrders.forEach((order) => {
				const orderDate = new Date(order.createdAt);
				let dateKey = '';

				// 根据interval生成日期键
				if (interval === 'day') {
					dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
				} else if (interval === 'week') {
					// 获取本周的开始日期
					const day = orderDate.getDay() || 7; // 将周日视为一周的第7天
					const diff = orderDate.getDate() - day + 1;
					const weekStart = new Date(orderDate.setDate(diff));
					dateKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
				} else if (interval === 'month') {
					dateKey = `${orderDate.getFullYear()}-${String(
						orderDate.getMonth() + 1
					).padStart(2, '0')}-01`;
				}

				// 更新统计数据
				if (statisticsMap.has(dateKey)) {
					const stats = statisticsMap.get(dateKey)!;
					stats.amount += order.totalAmount;
					stats.count += 1;
				} else {
					statisticsMap.set(dateKey, {
						date: dateKey,
						amount: order.totalAmount,
						count: 1,
					});
				}
			});

			// 转换为数组并排序
			const statistics = Array.from(statisticsMap.values()).sort(
				(a, b) =>
					new Date(a.date).getTime() - new Date(b.date).getTime()
			);

			return statistics;
		} catch (error) {
			console.error('获取销售统计失败:', error);
			return [];
		}
	},

	// 获取热销商品排行
	getTopProducts: async (
		limit = 10,
		startDate?: string,
		endDate?: string
	): Promise<TopProduct[]> => {
		try {
			// 实现热销商品排行逻辑
			const productSales: Record<
				string,
				{ quantity: number; amount: number }
			> = {};

			// 获取所有订单项
			const allOrderItems: OrderItem[] = [];
			await orderItemsStore.iterate((value) => {
				allOrderItems.push(value as OrderItem);
			});

			// 如果提供了日期范围，获取对应的订单
			let filteredOrderIds: string[] = [];
			if (startDate && endDate) {
				const allOrders: Order[] = [];
				await ordersStore.iterate((value) => {
					allOrders.push(value as Order);
				});

				// 筛选日期范围内的订单
				const filteredOrders = allOrders.filter((order) => {
					const orderDate = new Date(order.createdAt);
					return (
						orderDate >= new Date(startDate!) &&
						orderDate <= new Date(endDate!)
					);
				});

				filteredOrderIds = filteredOrders.map((order) => order.id);
			}

			// 统计每个商品的销售数量和金额
			const relevantItems =
				filteredOrderIds.length > 0
					? allOrderItems.filter((item) =>
							filteredOrderIds.includes(item.orderId)
						)
					: allOrderItems;

			relevantItems.forEach((item) => {
				const { productId, quantity, subtotal } = item;
				if (!productSales[productId]) {
					productSales[productId] = { quantity: 0, amount: 0 };
				}
				productSales[productId].quantity += quantity;
				productSales[productId].amount += subtotal;
			});

			// 转换为数组并排序
			const topProducts = Object.entries(productSales)
				.map(([productId, data]) => ({ productId, ...data }))
				.sort((a, b) => b.quantity - a.quantity)
				.slice(0, limit);

			return topProducts;
		} catch (error) {
			console.error('获取热销商品排行失败:', error);
			return [];
		}
	},

	// 获取所有订单
	getAllOrders: async (): Promise<Order[]> => {
		try {
			const orders: Order[] = [];
			await ordersStore.iterate((value) => {
				orders.push(value as Order);
			});
			return orders.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() -
					new Date(a.createdAt).getTime()
			);
		} catch (error) {
			console.error('获取订单列表失败:', error);
			return [];
		}
	},

	// 获取指定日期范围内的订单
	getByDateRange: async (
		startDate: string,
		endDate: string
	): Promise<Order[]> => {
		try {
			const orders: Order[] = [];
			await ordersStore.iterate((value) => {
				const orderDate = new Date((value as Order).createdAt);
				if (
					orderDate >= new Date(startDate) &&
					orderDate <= new Date(endDate)
				) {
					orders.push(value as Order);
				}
			});
			return orders.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() -
					new Date(a.createdAt).getTime()
			);
		} catch (error) {
			console.error('获取订单列表失败:', error);
			return [];
		}
	},

	// 获取所有订单项
	getAllOrderItems: async (): Promise<OrderItem[]> => {
		try {
			const orderItems: OrderItem[] = [];
			await orderItemsStore.iterate((value) => {
				orderItems.push(value as OrderItem);
			});
			return orderItems;
		} catch (error) {
			console.error('获取订单项列表失败:', error);
			return [];
		}
	},

	// 获取订单详情
	getOrderDetails: async (
		orderId: string
	): Promise<{ order: Order | null; items: OrderItem[] }> => {
		try {
			const order = (await ordersStore.getItem(orderId)) as Order | null;
			const items: OrderItem[] = [];

			if (order) {
				await orderItemsStore.iterate((value) => {
					if ((value as OrderItem).orderId === orderId) {
						items.push(value as OrderItem);
					}
				});
			}

			return { order, items };
		} catch (error) {
			console.error('获取订单详情失败:', error);
			return { order: null, items: [] };
		}
	},

	// 硬删除订单
	delete: async (id: string): Promise<void> => {
		try {
			const orders: Order[] = [];
			await ordersStore.iterate((value) => {
				orders.push(value as Order);
			});

			const orderItems: OrderItem[] = [];
			await orderItemsStore.iterate((value) => {
				orderItems.push(value as OrderItem);
			});

			// 删除订单
			await ordersStore.removeItem(id);

			// 删除订单相关的商品
			for (const item of orderItems) {
				if (item.orderId === id) {
					await orderItemsStore.removeItem(item.id);
				}
			}
		} catch (error) {
			console.error('删除订单失败:', error);
			throw error;
		}
	},

	// 软删除订单
	softDelete: async (id: string): Promise<void> => {
		try {
			const order = (await ordersStore.getItem(id)) as Order | null;
			if (order) {
				// 更新订单状态为cancelled作为软删除标记
				const updatedOrder: Order = {
					...order,
					status: 'cancelled',
				};
				await ordersStore.setItem(id, updatedOrder);
			}
		} catch (error) {
			console.error('软删除订单失败:', error);
			throw error;
		}
	},

	// 更新订单
	update: async (order: Order, items: OrderItem[]): Promise<void> => {
		try {
			// 更新订单信息
			await ordersStore.setItem(order.id, order);

			// 获取所有订单项
			const allOrderItems: OrderItem[] = [];
			await orderItemsStore.iterate((value) => {
				allOrderItems.push(value as OrderItem);
			});

			// 删除旧的订单商品
			for (const item of allOrderItems) {
				if (item.orderId === order.id) {
					await orderItemsStore.removeItem(item.id);
				}
			}

			// 添加新的订单商品
			for (const item of items) {
				await orderItemsStore.setItem(item.id, {
					...item,
					orderId: order.id,
				});
			}
		} catch (error) {
			console.error('更新订单失败:', error);
			throw error;
		}
	},

	// 获取订单商品
	getOrderItems: async (orderId: string): Promise<OrderItem[]> => {
		try {
			const items: OrderItem[] = [];
			await orderItemsStore.iterate((value) => {
				if ((value as OrderItem).orderId === orderId) {
					items.push(value as OrderItem);
				}
			});
			return items;
		} catch (error) {
			console.error('获取订单商品失败:', error);
			throw error;
		}
	},

	// 删除超过一年的订单数据
	deleteOldOrders: async (): Promise<{ count: number; success: boolean }> => {
		try {
			// 计算一年前的日期
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

			// 获取所有订单
			const orders: Order[] = [];
			await ordersStore.iterate((value) => {
				orders.push(value as Order);
			});

			// 筛选出一年前的订单
			const oldOrders = orders.filter(
				(order) => new Date(order.createdAt) < oneYearAgo
			);

			if (oldOrders.length === 0) {
				return { count: 0, success: true };
			}

			// 收集所有需要删除的订单ID
			const orderIdsToDelete = oldOrders.map((order) => order.id);

			// 获取所有订单项
			const orderItems: OrderItem[] = [];
			await orderItemsStore.iterate((value) => {
				orderItems.push(value as OrderItem);
			});

			// 筛选出需要删除的订单项
			const orderItemsToDelete = orderItems.filter((item) =>
				orderIdsToDelete.includes(item.orderId)
			);

			// 删除订单项
			for (const item of orderItemsToDelete) {
				await orderItemsStore.removeItem(item.id);
			}

			// 删除订单
			for (const orderId of orderIdsToDelete) {
				await ordersStore.removeItem(orderId);
			}

			return { count: oldOrders.length, success: true };
		} catch (error) {
			console.error('删除旧订单数据失败:', error);
			return { count: 0, success: false };
		}
	},
};
