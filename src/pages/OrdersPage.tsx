/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState, useEffect } from 'react';
import {
	Table,
	Button,
	Modal,
	Form,
	Input,
	InputNumber,
	Select,
	Space,
	Popconfirm,
	message,
	Tag,
	Row,
	Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
	SearchOutlined,
	EditOutlined,
	DeleteOutlined,
} from '@ant-design/icons';
import { orderService, productService } from '../db';
import type { Order, OrderItem, Product } from '../db';
import Page from '@/components/Page';

const OrdersPage: React.FC = () => {
	const [orders, setOrders] = useState<Order[]>([]);
	const [searchKeyword, setSearchKeyword] = useState('');
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [editingOrder, setEditingOrder] = useState<Order | null>(null);
	const [form] = Form.useForm();
	const [tempOrderItems, setTempOrderItems] = useState<OrderItem[]>([]);
	const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
	const [orderDetailsMap, setOrderDetailsMap] = useState<
		Map<string, OrderItem[]>
	>(new Map());

	// 加载订单数据
	const loadOrders = async () => {
		try {
			const allOrders = await orderService.getAllOrders();
			setOrders(allOrders);

			// 预加载所有订单的商品信息
			const newOrderDetailsMap = new Map();
			for (const order of allOrders) {
				const items = await orderService.getOrderItems(order.id);
				newOrderDetailsMap.set(order.id, items);
			}
			setOrderDetailsMap(newOrderDetailsMap);
		} catch (error) {
			message.error('加载订单数据失败');
			console.error('加载订单数据失败:', error);
		}
	};

	// 加载商品数据
	const loadProducts = async () => {
		try {
			const allProducts = await productService
				.getAll()
				.then((result) => result.list);
			setSelectedProducts(allProducts);
		} catch (error) {
			message.error('加载商品数据失败');
			console.error('加载商品数据失败:', error);
		}
	};

	useEffect(() => {
		loadOrders();
		loadProducts();
	}, []);

	// 打开编辑模态框
	const handleEdit = async (order: Order) => {
		setEditingOrder(order);

		// 加载订单中的商品
		try {
			const items = await orderService.getOrderItems(order.id);
			setTempOrderItems([...items]); // 创建临时状态用于编辑
			form.setFieldsValue({
				status: order.status,
			});
		} catch (error) {
			message.error('加载订单商品失败');
			console.error('加载订单商品失败:', error);
		}

		setIsModalVisible(true);
	};

	// 删除订单（软删除）
	const handleDelete = async (id: string) => {
		try {
			await orderService.softDelete(id);
			await loadOrders();
			message.success('订单删除成功');
		} catch (error) {
			message.error('订单删除失败');
			console.error('订单删除失败:', error);
		}
	};

	// 更新临时订单商品
	const updateOrderItem = (
		index: number,
		field: keyof OrderItem,
		value: any
	) => {
		const newTempOrderItems = [...tempOrderItems];
		// @ts-ignore
		newTempOrderItems[index][field] = value;

		// 如果选择了商品，自动填充价格
		if (field === 'productId') {
			const selectedProduct = selectedProducts.find(
				(p) => p.id === value
			);
			if (selectedProduct) {
				newTempOrderItems[index].unitPrice = selectedProduct.price;
				// 自动计算小计
				newTempOrderItems[index].subtotal =
					selectedProduct.price *
					(newTempOrderItems[index].quantity || 1);
			}
		} else if (field === 'quantity' || field === 'unitPrice') {
			// 当数量或单价变化时，重新计算小计
			const quantity = newTempOrderItems[index].quantity || 0;
			const unitPrice = newTempOrderItems[index].unitPrice || 0;
			newTempOrderItems[index].subtotal = quantity * unitPrice;
		}

		setTempOrderItems(newTempOrderItems);
	};

	// 删除临时订单商品
	const removeOrderItem = (index: number) => {
		const newTempOrderItems = [...tempOrderItems];
		newTempOrderItems.splice(index, 1);
		setTempOrderItems(newTempOrderItems);
	};

	// 保存订单
	const handleSave = async () => {
		try {
			const values = await form.validateFields();

			if (!editingOrder) return;

			const updatedOrder: Order = {
				...editingOrder,
				status: values.status,
				// 重新计算订单总价
				totalAmount: calculateOrderTotal(tempOrderItems),
			};

			// 确保订单项有正确的unitPrice和subtotal
			const updatedItems = tempOrderItems.map((item) => ({
				...item,
				unitPrice: item.unitPrice || 0,
				subtotal: (item.unitPrice || 0) * (item.quantity || 0),
			}));

			await orderService.update(updatedOrder, updatedItems);
			await loadOrders();
			message.success('订单更新成功');
			setIsModalVisible(false);
			setEditingOrder(null);
			setTempOrderItems([]);
		} catch (error) {
			message.error('保存订单失败');
			console.error('保存订单失败:', error);
		}
	};

	// 计算订单总价
	const calculateOrderTotal = (items: OrderItem[]) => {
		return items.reduce(
			(total, item) => total + item.unitPrice * item.quantity,
			0
		);
	};

	// 搜索订单
	const handleSearch = (value: string) => {
		setSearchKeyword(value);
	};

	// 过滤订单
	const filteredOrders = orders.filter(
		(order) =>
			order.id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
			order.totalAmount.toString().includes(searchKeyword) ||
			order.status.toLowerCase().includes(searchKeyword.toLowerCase())
	);

	// 订单表格列配置
	const columns: ColumnsType<Order> = [
		{
			title: '订单ID',
			dataIndex: 'id',
			key: 'id',
		},
		{
			title: '创建时间',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (text) => new Date(text).toLocaleString(),
		},
		{
			title: '订单总价',
			dataIndex: 'totalAmount',
			key: 'totalAmount',
			render: (text) => text?.toFixed(2) || '0.00',
		},
		{
			title: '订单状态',
			dataIndex: 'status',
			key: 'status',
			render: (status: string) => {
				let color = 'blue';
				let text = status;

				switch (status) {
					case 'completed':
						color = 'success';
						text = '已完成';
						break;
					case 'pending':
						color = 'warning';
						text = '待处理';
						break;
					case 'cancelled':
						color = 'error';
						text = '已取消';
						break;
				}

				return <Tag color={color}>{text}</Tag>;
			},
		},
		{
			title: '商品数量',
			key: 'itemCount',
			render: (_, record) => {
				const items = orderDetailsMap.get(record.id) || [];
				return items.length;
			},
		},
		{
			title: '操作',
			key: 'action',
			render: (_, record) => (
				<Space size="middle">
					<Button
						type="link"
						icon={<EditOutlined />}
						onClick={() => handleEdit(record)}
					>
						编辑
					</Button>
					<Popconfirm
						title="确定要将这个订单标记为已删除吗？"
						onConfirm={() => handleDelete(record.id)}
						okText="确定"
						cancelText="取消"
					>
						<Button type="link" danger icon={<DeleteOutlined />}>
							删除
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<Page>
			<div className="mb-4 flex justify-between items-center">
				<h1 className="text-xl font-bold">订单管理</h1>
				<Input
					placeholder="搜索订单ID或状态"
					prefix={<SearchOutlined />}
					value={searchKeyword}
					onChange={(e) => setSearchKeyword(e.target.value)}
					onPressEnter={() => handleSearch(searchKeyword)}
					style={{ width: 300 }}
				/>
			</div>

			<Table
				columns={columns}
				dataSource={filteredOrders}
				rowKey="id"
				pagination={{ pageSize: 10 }}
			/>

			{/* 编辑订单模态框 */}
			<Modal
				title="编辑订单"
				open={isModalVisible}
				onOk={handleSave}
				onCancel={() => {
					setIsModalVisible(false);
					setEditingOrder(null);
					setTempOrderItems([]);
					form.resetFields();
				}}
				width={800}
			>
				<Form form={form} layout="vertical" className="mb-4">
					<Form.Item
						name="status"
						label="订单状态"
						rules={[{ required: true, message: '请选择订单状态' }]}
					>
						<Select
							options={[
								{ label: '已完成', value: 'completed' },
								{ label: '已取消', value: 'cancelled' },
								{ label: '待处理', value: 'pending' },
							]}
						/>
					</Form.Item>
				</Form>

				<div className="mb-4">
					<div className="mb-2">
						<h3 className="text-lg font-semibold">订单商品</h3>
					</div>

					<div className="border rounded-lg p-4">
						{tempOrderItems.length === 0 ? (
							<p className="text-gray-500 text-center">
								暂无商品
							</p>
						) : (
							<div className="space-y-4">
								{/* 添加标题行 */}
								<Row className="font-bold text-gray-700 pb-2 border-b">
									<Col span={10}>商品名称</Col>
									<Col span={4}>数量</Col>
									<Col span={4}>单价</Col>
									<Col span={4}>小计</Col>
									<Col span={2}>操作</Col>
								</Row>

								{tempOrderItems.map((tempItem, index) => (
									<Row
										key={tempItem.id}
										align="middle"
										className="p-2 border-b"
										gutter={16}
									>
										<Col span={10}>
											<Select
												style={{ width: '100%' }}
												placeholder="选择商品"
												value={tempItem.productId}
												showSearch
												optionFilterProp="label"
												onChange={(value) =>
													updateOrderItem(
														index,
														'productId',
														value
													)
												}
												options={selectedProducts.map(
													(product) => ({
														label: `${product.name} (${product.barcode})`,
														value: product.id,
													})
												)}
											/>
										</Col>
										<Col span={4}>
											<InputNumber
												style={{ width: '100%' }}
												placeholder="数量"
												value={tempItem.quantity}
												min={1}
												onChange={(value) =>
													updateOrderItem(
														index,
														'quantity',
														value
													)
												}
											/>
										</Col>
										<Col span={4}>
											<InputNumber
												style={{ width: '100%' }}
												placeholder="单价"
												value={tempItem.unitPrice}
												min={0}
												onChange={(value) =>
													updateOrderItem(
														index,
														'unitPrice',
														value
													)
												}
											/>
										</Col>
										<Col span={4}>
											<span className="text-gray-500">
												¥
												{(
													tempItem.subtotal || 0
												).toFixed(2)}
											</span>
										</Col>
										<Col span={2}>
											<Popconfirm
												title="确定要删除这个商品吗？"
												onConfirm={() =>
													removeOrderItem(index)
												}
												okText="确定"
												cancelText="取消"
											>
												<Button
													type="link"
													danger
													icon={<DeleteOutlined />}
												>
													删除
												</Button>
											</Popconfirm>
										</Col>
									</Row>
								))}

								<div className="flex justify-end mt-4">
									<span className="text-lg font-bold">
										订单总价: ¥
										{calculateOrderTotal(
											tempOrderItems
										).toFixed(2)}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</Modal>
		</Page>
	);
};

export default OrdersPage;
