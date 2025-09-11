import localforage from 'localforage';
import { isProduction } from '../config';

// 数据模型类型定义
export interface Product {
	id: string;
	name: string;
	barcode: string;
	price: number;
	stock: number;
	category?: string;
	unit?: string;
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
	createdAt?: string;
	productName?: string;
	category?: string;
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
const productsStore = localforage.createInstance({
	name: 'SupermarketPriceSystem',
	storeName: 'products',
});

const ordersStore = localforage.createInstance({
	name: 'SupermarketPriceSystem',
	storeName: 'orders',
});

const orderItemsStore = localforage.createInstance({
	name: 'SupermarketPriceSystem',
	storeName: 'order_items',
});

// 商品操作服务
export const productService = {
	// 获取所有商品
	getAll: async (
		page = 1,
		pageSize = 10,
		keyword = ''
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

			// 按创建时间排序（降序）
			allProducts.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() -
					new Date(a.createdAt).getTime()
			);

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

	// 添加商品
	add: async (
		product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Product> => {
		try {
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
	// 创建订单
	create: async (
		orderData: CreateOrderData
	): Promise<{ orderId: string; createdAt: Date }> => {
		try {
			const now = new Date();
			const orderId = Date.now().toString(); // 生成唯一订单ID

			// 创建订单
			const order: Order = {
				id: orderId,
				totalAmount: orderData.totalAmount,
				createdAt: now.toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
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
					dateKey = orderDate.toISOString().split('T')[0];
				} else if (interval === 'week') {
					// 获取本周的开始日期
					const day = orderDate.getDay() || 7; // 将周日视为一周的第7天
					const diff = orderDate.getDate() - day + 1;
					const weekStart = new Date(orderDate.setDate(diff));
					dateKey = weekStart.toISOString().split('T')[0];
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
};
