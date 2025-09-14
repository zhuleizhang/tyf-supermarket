/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
	Card,
	Row,
	Col,
	Statistic,
	Select,
	Space,
	Table,
	Empty,
	message,
	Spin,
} from 'antd';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { productService, orderService, categoryService } from '../db';
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	Legend,
	BarChart,
	Bar,
} from 'recharts';
import { useMemoizedFn } from 'ahooks';
import Page from '@/components/Page';

const { RangePicker } = DatePicker;

interface OrderItem {
	id: string;
	productId: string;
	productName?: string;
	category?: string;
	quantity: number;
	unitPrice: number;
	orderId: string;
	createdAt?: string;
}

interface Product {
	id: string;
	name: string;
	category?: string;
	price: number;
	stock: number;
	image?: string;
	barcode?: string;
	unit?: string;
	createdAt?: string;
	updatedAt?: string;
}

interface Category {
	id: string;
	name: string;
	description?: string;
	createdAt?: string;
	updatedAt?: string;
}

interface ProductRankingItem {
	productId: string;
	productName: string;
	category: string;
	salesQuantity: number;
	salesAmount: number;
}

interface CategorySalesItem {
	category: string;
	salesAmount: number;
	value: number;
}

interface HourlySalesItem {
	hour: string;
	salesAmount: number;
}

interface SalesTrendItem {
	date: string;
	salesAmount: number;
	orderCount: number;
}

interface StatisticsData {
	totalSales: number;
	totalOrders: number;
	averageOrderValue: number;
}

const StatisticsPage: React.FC = () => {
	// 状态管理
	const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
		dayjs().subtract(6, 'day').startOf('day'),
		dayjs().endOf('day'),
	]);
	const [selectedProduct, setSelectedProduct] = useState<string>('all');
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]); // 添加分类状态
	const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
	const [statistics, setStatistics] = useState<StatisticsData>({
		totalSales: 0,
		totalOrders: 0,
		averageOrderValue: 0,
	});
	const [salesTrendData, setSalesTrendData] = useState<SalesTrendItem[]>([]);
	const [productRankingData, setProductRankingData] = useState<
		ProductRankingItem[]
	>([]);
	const [categorySalesData, setCategorySalesData] = useState<
		CategorySalesItem[]
	>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [hourlySalesData, setHourlySalesData] = useState<HourlySalesItem[]>(
		[]
	);

	// 加载商品数据
	const loadProducts = useCallback(async () => {
		try {
			const { list } = await productService.getAll();
			setProducts(list);
		} catch (err) {
			console.error('Error loading products:', err);
			setError('加载商品数据失败');
			message.error('加载商品数据失败');
		}
	}, []);

	// 加载分类数据
	const loadCategories = useCallback(async () => {
		try {
			const categoryList = await categoryService.getAll();
			setCategories(categoryList);
		} catch (err) {
			console.error('Error loading categories:', err);
			setError('加载分类数据失败');
			message.error('加载分类数据失败');
		}
	}, []);

	// 计算统计数据
	const calculateStatistics = useCallback((items: OrderItem[]) => {
		if (!items.length) {
			return {
				totalSales: 0,
				totalOrders: 0,
				averageOrderValue: 0,
			};
		}

		const totalSales = items.reduce(
			(sum, item) => sum + item.unitPrice * item.quantity,
			0
		);
		const orderIds = new Set(items.map((item) => item.orderId));
		const totalOrders = orderIds.size;
		const averageOrderValue =
			totalOrders > 0 ? totalSales / totalOrders : 0;

		return {
			totalSales,
			totalOrders,
			averageOrderValue,
		};
	}, []);

	// 生成销售趋势数据
	const generateSalesTrendData = useCallback(
		(items: OrderItem[], dateRange: [Dayjs, Dayjs]) => {
			const dateMap = new Map<
				string,
				{ salesAmount: number; orderIds: Set<string> }
			>();

			const dateFormat = 'YYYY-MM-DD';

			// 按日期聚合数据
			items.forEach((item) => {
				// 使用订单日期作为后备选项
				const date = item.createdAt
					? dayjs(item.createdAt).format(dateFormat)
					: dayjs().format(dateFormat);

				if (dateMap.has(date)) {
					const data = dateMap.get(date)!;
					data.salesAmount += item.unitPrice * item.quantity;
					data.orderIds.add(item.orderId);
				} else {
					dateMap.set(date, {
						salesAmount: item.unitPrice * item.quantity,
						orderIds: new Set([item.orderId]),
					});
				}
			});

			// 生成日期区间内的所有日期
			const allDates: string[] = [];
			const startDate = dateRange[0].startOf('day');
			const endDate = dateRange[1].endOf('day');
			let currentDate = startDate;

			while (
				currentDate.isBefore(endDate) ||
				currentDate.isSame(endDate, 'day')
			) {
				allDates.push(currentDate.format(dateFormat));
				currentDate = currentDate.add(1, 'day');
			}

			// 确保日期区间内的每一天都有数据，没有数据的日期填充0
			allDates.forEach((date) => {
				if (!dateMap.has(date)) {
					dateMap.set(date, {
						salesAmount: 0,
						orderIds: new Set(),
					});
				}
			});

			// 转换为数组并排序
			const trendData: SalesTrendItem[] = Array.from(dateMap.entries())
				.map(([date, data]) => ({
					date,
					salesAmount: data.salesAmount,
					orderCount: data.orderIds.size,
				}))
				.sort((a, b) => a.date.localeCompare(b.date));

			return trendData;
		},
		[]
	);

	// 生成商品销售排行数据
	const generateProductRankingData = useCallback(
		(items: OrderItem[], productList: Product[]) => {
			const productMap = new Map<
				string,
				{
					salesQuantity: number;
					salesAmount: number;
					productName: string;
					category: string;
				}
			>();

			// 构建商品ID到商品信息的映射，提高查找效率
			const productIdMap = new Map(
				productList.map((product) => [product.id, product])
			);

			// 聚合每个商品的销售数据和商品信息
			items.forEach((item) => {
				// 从映射中快速查找商品信息
				const product = productIdMap.get(item.productId);
				// 优先使用完整的商品信息，其次是订单项中的信息，最后是默认值
				const productName =
					product?.name || item.productName || '未知商品';

				// 获取分类名称（而不是分类ID）
				let category = '未分类';
				if (product && product.category) {
					// 尝试查找分类名称
					const categoryObj = categories.find(
						(c) => c.id === product.category
					);
					category = categoryObj?.name || product.category;
				} else if (item.category) {
					category = item.category;
				}

				if (productMap.has(item.productId)) {
					const data = productMap.get(item.productId)!;
					productMap.set(item.productId, {
						salesQuantity: data.salesQuantity + item.quantity,
						salesAmount:
							data.salesAmount + item.unitPrice * item.quantity,
						productName: productName, // 直接使用最新获取的名称
						category: category, // 直接使用最新获取的分类
					});
				} else {
					productMap.set(item.productId, {
						salesQuantity: item.quantity,
						salesAmount: item.unitPrice * item.quantity,
						productName: productName,
						category: category,
					});
				}
			});

			// 转换为数组并确保所有数据完整
			const rankingData: ProductRankingItem[] = Array.from(
				productMap.entries()
			).map(([productId, data]) => ({
				productId,
				productName: data.productName || '未知商品',
				category: data.category || '未分类',
				salesQuantity: data.salesQuantity,
				salesAmount: data.salesAmount,
			}));

			// 按销售数量排序并取前10名
			return rankingData
				.sort((a, b) => b.salesQuantity - a.salesQuantity)
				.slice(0, 10);
		},
		[categories] // 添加categories作为依赖
	);

	// 生成分类销售数据
	const generateCategorySalesData = useCallback(
		(items: OrderItem[], productList: Product[]) => {
			const categoryMap = new Map<string, number>();

			// 聚合每个分类的销售数据
			items.forEach((item) => {
				const product = productList.find(
					(p) => p.id === item.productId
				);

				// 获取分类名称（而不是分类ID）
				let categoryName = '未分类';
				if (product && product.category) {
					// 尝试查找分类名称
					const categoryObj = categories.find(
						(c) => c.id === product.category
					);
					categoryName = categoryObj?.name || product.category;
				} else if (item.category) {
					categoryName = item.category;
				}

				if (categoryMap.has(categoryName)) {
					categoryMap.set(
						categoryName,
						categoryMap.get(categoryName)! +
							item.unitPrice * item.quantity
					);
				} else {
					categoryMap.set(
						categoryName,
						item.unitPrice * item.quantity
					);
				}
			});

			// 转换为数组
			const categoryData: CategorySalesItem[] = Array.from(
				categoryMap.entries()
			).map(([category, salesAmount]) => ({
				category,
				salesAmount,
				value: salesAmount,
			}));

			return categoryData;
		},
		[categories] // 添加categories作为依赖
	);

	// 生成每小时销售额数据
	const generateHourlySalesData = useCallback((items: OrderItem[]) => {
		const hourlyMap = new Map<string, number>();

		// 初始化0-23点的销售额为0
		for (let i = 0; i < 24; i++) {
			const hourKey = `${i.toString().padStart(2, '0')}:00`;
			hourlyMap.set(hourKey, 0);
		}

		// 统计每个小时的销售额
		items.forEach((item) => {
			// 使用订单日期作为后备选项
			const date = item.createdAt ? dayjs(item.createdAt) : dayjs();
			const hourKey = `${date.hour().toString().padStart(2, '0')}:00`;
			const currentSales = hourlyMap.get(hourKey) || 0;
			hourlyMap.set(
				hourKey,
				currentSales + item.unitPrice * item.quantity
			);
		});

		// 转换为数组并返回
		return Array.from(hourlyMap.entries()).map(([hour, salesAmount]) => ({
			hour,
			salesAmount,
		}));
	}, []);

	// 过滤订单数据
	const filterOrderItems = useCallback(
		(items: OrderItem[]) => {
			if (selectedProduct === 'all') {
				return items;
			}
			return items.filter((item) => item.productId === selectedProduct);
		},
		[selectedProduct]
	);

	const handleSetData = useMemoizedFn(
		(orderItemData: OrderItem[], dateRange: [Dayjs, Dayjs]) => {
			const filteredItems = filterOrderItems(orderItemData || []);

			// 更新统计数据
			setStatistics(calculateStatistics(filteredItems));

			// 更新销售趋势数据
			setSalesTrendData(generateSalesTrendData(filteredItems, dateRange));

			// 更新商品销售排行数据
			setProductRankingData(
				generateProductRankingData(filteredItems, products)
			);

			// 更新分类销售数据
			setCategorySalesData(
				generateCategorySalesData(filteredItems, products)
			);

			// 更新每小时销售额数据
			setHourlySalesData(generateHourlySalesData(filteredItems));
		}
	);

	// 加载订单数据
	const loadOrders = useCallback(async () => {
		if (!dateRange || !dateRange[0] || !dateRange[1]) return;

		setLoading(true);
		setError(null);

		try {
			// 调整日期范围为开始时间的0点和结束时间的23:59:59
			const startDate = dateRange[0].startOf('day').toLocaleString();
			const endDate = dateRange[1].endOf('day').toLocaleString();

			console.log(
				'Loading orders for date range:',
				startDate,
				'to',
				endDate
			);

			// 获取日期范围内的所有订单
			const ordersInRange = await orderService.getByDateRange(
				startDate,
				endDate
			);
			console.log(ordersInRange, 'ordersInRange');

			// 获取这些订单的所有订单项
			const allOrderItems: OrderItem[] = [];
			for (const order of ordersInRange) {
				const items = await orderService.getOrderItems(order.id);
				// 为每个订单项添加订单的createdAt日期
				const itemsWithDate = items.map((item) => ({
					...item,
					createdAt: item.createdAt || order.createdAt,
				}));
				allOrderItems.push(...itemsWithDate);
			}

			console.log('Loaded order items:', allOrderItems.length);
			setOrderItems(allOrderItems);
			handleSetData(allOrderItems, dateRange);
		} catch (err) {
			console.error('Error loading orders:', err);
			setError('加载订单数据失败');
			message.error('加载订单数据失败');
		} finally {
			setLoading(false);
		}
	}, [dateRange, handleSetData]);

	// 处理日期范围变更
	useEffect(() => {
		// 确保dateRange始终有效
		if (dateRange && dateRange[0] && dateRange[1]) {
			loadOrders();
		}
	}, [dateRange, loadOrders]);

	// 初始化加载商品和分类数据
	useEffect(() => {
		Promise.all([loadProducts(), loadCategories()]);
	}, [loadProducts, loadCategories]);

	// 处理商品选择变更
	const handleProductChange = (value: string) => {
		setSelectedProduct(value);
		handleSetData(orderItems, dateRange);
	};

	// 处理日期范围选择
	const handleDateChange = (dates: [Dayjs, Dayjs] | null) => {
		setDateRange(dates);
	};

	// 商品销售排行表格列配置
	const rankingColumns = [
		{
			title: '排名',
			key: 'ranking',
			render: (_, __, index) => index + 1,
			width: 100,
		},
		{
			title: '商品名称',
			dataIndex: 'productName',
			key: 'productName',
			ellipsis: true,
		},
		{
			title: '分类',
			dataIndex: 'category',
			key: 'category',
			width: 188,
		},
		{
			title: '销售数量',
			dataIndex: 'salesQuantity',
			key: 'salesQuantity',
			width: 188,
		},
		{
			title: '销售额',
			dataIndex: 'salesAmount',
			key: 'salesAmount',
			width: 188,
			render: (text: number) => `¥${text.toFixed(2)}`,
		},
	];

	// 饼图颜色
	const COLORS = [
		'#0088FE',
		'#00C49F',
		'#FFBB28',
		'#FF8042',
		'#a78bfa',
		'#f59e0b',
		'#ec4899',
		'#8b5cf6',
	];

	return (
		<Page>
			<Spin size="large" spinning={loading}>
				{error && (
					<div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md">
						{error}
					</div>
				)}

				<div className="mb-4 flex justify-between items-center">
					<h1 className="text-xl font-bold">销售统计</h1>
					<Space>
						<div className="flex gap-2">
							<RangePicker
								value={dateRange}
								onChange={handleDateChange}
								style={{ width: 400 }}
								allowClear={false}
								presets={[
									{
										label: '近七天',
										value: [
											dayjs().subtract(6, 'day'),
											dayjs(),
										],
									},
									{
										label: '上周',
										value: [
											dayjs()
												.subtract(1, 'week')
												.startOf('week'),
											dayjs()
												.subtract(1, 'week')
												.endOf('week'),
										],
									},
									{
										label: '上个月',
										value: [
											dayjs()
												.subtract(1, 'month')
												.startOf('month'),
											dayjs()
												.subtract(1, 'month')
												.endOf('month'),
										],
									},
								]}
							/>
							<Select
								style={{ width: 288 }}
								placeholder="选择商品"
								value={selectedProduct}
								onChange={handleProductChange}
								showSearch
								optionFilterProp="label"
								options={[
									{
										label: '全部商品',
										value: 'all',
									},
									...(products.map((p) => {
										return {
											label: p.name,
											value: p.id,
										};
									}) || []),
								]}
							></Select>
						</div>
					</Space>
				</div>

				{/* 统计卡片 - 增强显示效果 */}
				<Row gutter={16} className="mb-6">
					<Col span={8}>
						<Card className="shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow duration-300">
							<Statistic
								title="总销售额"
								value={statistics.totalSales}
								precision={2}
								valueStyle={{
									color: '#3f8600',
									fontSize: '24px',
									fontWeight: 'bold',
								}}
								prefix="¥"
							/>
						</Card>
					</Col>
					<Col span={8}>
						<Card className="shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow duration-300">
							<Statistic
								title="订单总数"
								value={statistics.totalOrders}
								valueStyle={{
									color: '#1890ff',
									fontSize: '24px',
									fontWeight: 'bold',
								}}
							/>
						</Card>
					</Col>
					<Col span={8}>
						<Card className="shadow-lg border-l-4 border-red-500 hover:shadow-xl transition-shadow duration-300">
							<Statistic
								title="平均订单价"
								value={statistics.averageOrderValue}
								precision={2}
								valueStyle={{
									color: '#cf1322',
									fontSize: '24px',
									fontWeight: 'bold',
								}}
								prefix="¥"
							/>
						</Card>
					</Col>
				</Row>

				{/* 销售趋势和分类销售统计 - 同一行显示 */}
				<Row gutter={16} className="mb-6">
					<Col span={24}>
						<Card title="销售趋势" style={{ height: 400 }}>
							{salesTrendData.length > 0 ? (
								<ResponsiveContainer width="100%" height={300}>
									<AreaChart
										data={salesTrendData}
										margin={{
											top: 10,
											right: 30,
											left: 0,
											bottom: 0,
										}}
									>
										<defs>
											<linearGradient
												id="colorSales"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#82ca9d"
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor="#82ca9d"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<XAxis dataKey="date" />
										<YAxis />
										<CartesianGrid strokeDasharray="3 3" />
										<Tooltip
											formatter={(value: number) =>
												`¥${value.toFixed(2)}`
											}
										/>
										<Area
											type="monotone"
											dataKey="salesAmount"
											stroke="#82ca9d"
											fillOpacity={1}
											fill="url(#colorSales)"
											name="销售额"
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<Empty description="暂无销售数据" />
							)}
						</Card>
					</Col>
				</Row>

				{/* 每小时销售额分布 */}
				<Row gutter={16} className="mb-6">
					<Col span={24}>
						<Card title="每小时销售额分布" style={{ height: 400 }}>
							{hourlySalesData.length > 0 ? (
								<ResponsiveContainer width="100%" height={300}>
									<BarChart
										data={hourlySalesData}
										margin={{
											top: 10,
											right: 30,
											left: 0,
											bottom: 0,
										}}
									>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="hour" />
										<YAxis />
										<Tooltip
											formatter={(value: number) =>
												`¥${value.toFixed(2)}`
											}
										/>
										<Bar
											dataKey="salesAmount"
											fill="#82ca9d"
											name="销售额"
										/>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<Empty description="暂无每小时销售数据" />
							)}
						</Card>
					</Col>
				</Row>

				<Row gutter={16} className="mb-6">
					<Col span={24}>
						<Card title="分类销售统计" style={{ height: 400 }}>
							{categorySalesData.length > 0 ? (
								<ResponsiveContainer width="100%" height={300}>
									<PieChart>
										<Pie
											data={categorySalesData}
											cx="50%"
											cy="50%"
											labelLine={true}
											label={({
												category,
												percent,
											}: any) =>
												`${category}: ${(
													percent * 100
												).toFixed(0)}%`
											}
											outerRadius={80}
											fill="#8884d8"
											dataKey="salesAmount"
											nameKey="category"
										>
											{categorySalesData.map(
												(entry, index) => (
													<Cell
														key={`cell-${index}`}
														fill={
															COLORS[
																index %
																	COLORS.length
															]
														}
													/>
												)
											)}
										</Pie>
										<Tooltip
											formatter={(
												value: number,
												name: string,
												props: any
											) => {
												// 直接从props中获取当前项的数据，而不是通过value查找
												const data = props.payload;
												return `¥${data.salesAmount.toFixed(
													2
												)}`;
											}}
										/>
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							) : (
								<Empty description="暂无分类销售数据" />
							)}
						</Card>
					</Col>
				</Row>

				{/* 商品销售排行 */}
				<Row gutter={16} className="mb-6">
					<Col span={24}>
						<Card title="商品销售排行（前10名）">
							{productRankingData.length > 0 ? (
								<Table
									columns={rankingColumns}
									dataSource={productRankingData}
									rowKey="productId"
									pagination={false}
								/>
							) : (
								<Empty description="暂无销售数据" />
							)}
						</Card>
					</Col>
				</Row>
			</Spin>
		</Page>
	);
};

export default StatisticsPage;
