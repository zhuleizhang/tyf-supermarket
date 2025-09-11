import React, { useState, useEffect } from 'react';
import {
	Table,
	Button,
	Input,
	Modal,
	Form,
	InputNumber,
	message,
	Tag,
	Select,
} from 'antd';
import {
	PlusOutlined,
	SearchOutlined,
	DeleteOutlined,
	EditOutlined,
} from '@ant-design/icons';
import { productService, type Product } from '../db';
import { useAppStore } from '../store';

const { Option } = Select;
const { Search } = Input;

// 商品分类选项
const productCategories = [
	'饮料',
	'零食',
	'方便食品',
	'熟食',
	'乳制品',
	'日用品',
	'其他',
];

const ProductsPage: React.FC = () => {
	const [products, setProducts] = useState<Product[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(10);

	// 模态框状态
	const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
	const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
	const [modalTitle, setModalTitle] = useState<string>('添加商品');

	// 获取全局状态
	const { searchKeyword, setSearchKeyword } = useAppStore();

	// 表单实例
	const [form] = Form.useForm();

	// 加载商品列表
	const loadProducts = async (page = 1, pageSize = 10, keyword = '') => {
		setLoading(true);
		try {
			const result = await productService.getAll(page, pageSize, keyword);
			setProducts(result.list);
			setTotal(result.total);
		} catch (error) {
			message.error('加载商品列表失败');
		} finally {
			setLoading(false);
		}
	};

	// 初始化加载
	useEffect(() => {
		loadProducts(currentPage, pageSize, searchKeyword);
	}, [currentPage, pageSize, searchKeyword]);

	// 处理搜索
	const handleSearch = (value: string) => {
		setSearchKeyword(value);
		setCurrentPage(1); // 搜索时重置到第一页
	};

	// 打开添加商品模态框
	const showAddModal = () => {
		setCurrentProduct(null);
		setModalTitle('添加商品');
		form.resetFields();
		setIsModalVisible(true);
	};

	// 打开编辑商品模态框
	const showEditModal = (product: Product) => {
		setCurrentProduct(product);
		setModalTitle('编辑商品');
		form.setFieldsValue({
			name: product.name,
			barcode: product.barcode,
			price: product.price,
			stock: product.stock,
			category: product.category || '',
			unit: product.unit || '',
		});
		setIsModalVisible(true);
	};

	// 处理提交表单
	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();

			if (currentProduct) {
				// 更新商品
				await productService.update(currentProduct.id, values);
				message.success('商品更新成功');
			} else {
				// 添加商品
				await productService.add(values);
				message.success('商品添加成功');
			}

			// 关闭模态框并刷新列表
			setIsModalVisible(false);
			loadProducts(currentPage, pageSize, searchKeyword);
		} catch (error) {
			message.error(currentProduct ? '商品更新失败' : '商品添加失败');
		}
	};

	// 处理删除商品
	const handleDelete = async (productId: string) => {
		Modal.confirm({
			title: '确认删除',
			content: '确定要删除这个商品吗？删除后无法恢复。',
			okText: '确认',
			cancelText: '取消',
			async onOk() {
				try {
					const success = await productService.delete(productId);
					if (success) {
						message.success('商品删除成功');
						loadProducts(currentPage, pageSize, searchKeyword);
					} else {
						message.error('商品删除失败');
					}
				} catch (error) {
					message.error('商品删除失败');
				}
			},
		});
	};

	// 表格列定义
	const columns = [
		{
			title: '商品名称',
			dataIndex: 'name',
			key: 'name',
			ellipsis: true,
			width: 180,
		},
		{
			title: '商品条码',
			dataIndex: 'barcode',
			key: 'barcode',
			width: 150,
		},
		{
			title: '价格',
			dataIndex: 'price',
			key: 'price',
			width: 100,
			render: (price: number) => `¥${price.toFixed(2)}`,
		},
		{
			title: '库存',
			dataIndex: 'stock',
			key: 'stock',
			width: 100,
			render: (stock: number) => (
				<span className={stock < 10 ? 'text-red-500' : ''}>
					{stock}
				</span>
			),
		},
		{
			title: '分类',
			dataIndex: 'category',
			key: 'category',
			width: 100,
			render: (category?: string) =>
				category ? (
					<Tag color="blue">{category}</Tag>
				) : (
					<Tag color="default">未分类</Tag>
				),
		},
		{
			title: '单位',
			dataIndex: 'unit',
			key: 'unit',
			width: 80,
		},
		{
			title: '创建时间',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 180,
			render: (createdAt: string) => {
				const date = new Date(createdAt);
				return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
			},
		},
		{
			title: '操作',
			key: 'action',
			width: 150,
			fixed: 'right' as const,
			render: (_: any, record: Product) => (
				<span>
					<Button
						type="link"
						icon={<EditOutlined />}
						onClick={() => showEditModal(record)}
					>
						编辑
					</Button>
					<Button
						type="link"
						danger
						icon={<DeleteOutlined />}
						onClick={() => handleDelete(record.id)}
					>
						删除
					</Button>
				</span>
			),
		},
	];

	return (
		<div className="p-4 bg-white rounded-lg shadow">
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-xl font-bold">商品管理</h1>
				<div className="flex gap-2">
					<Search
						placeholder="搜索商品名称或条码"
						allowClear
						enterButton={<SearchOutlined />}
						size="large"
						onSearch={handleSearch}
						style={{ width: 300 }}
					/>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={showAddModal}
						size="large"
					>
						添加商品
					</Button>
				</div>
			</div>

			<Table
				columns={columns}
				dataSource={products}
				rowKey="id"
				loading={loading}
				pagination={{
					current: currentPage,
					pageSize: pageSize,
					total: total,
					showSizeChanger: true,
					showTotal: (total) => `共 ${total} 条记录`,
					pageSizeOptions: ['10', '20', '50', '100'],
					onChange: (page, pageSize) => {
						setCurrentPage(page);
						setPageSize(pageSize);
					},
				}}
				scroll={{ x: 1200 }}
				className="mb-4"
			/>

			{/* 商品表单模态框 */}
			<Modal
				title={modalTitle}
				open={isModalVisible}
				onOk={handleSubmit}
				onCancel={() => setIsModalVisible(false)}
				okText="确定"
				cancelText="取消"
			>
				<Form
					form={form}
					layout="vertical"
					initialValues={{
						price: 0,
						stock: 0,
					}}
				>
					<Form.Item
						label="商品名称"
						name="name"
						rules={[{ required: true, message: '请输入商品名称' }]}
					>
						<Input placeholder="请输入商品名称" />
					</Form.Item>

					<Form.Item
						label="商品条码"
						name="barcode"
						rules={[
							{ required: true, message: '请输入商品条码' },
							{
								validator: async (_, value) => {
									if (!value) return;
									const product =
										await productService.getByBarcode(
											value
										);
									if (
										product &&
										product.id !== currentProduct?.id
									) {
										throw new Error('该条码已存在');
									}
								},
							},
						]}
					>
						<Input placeholder="请输入商品条码" />
					</Form.Item>

					<Form.Item
						label="商品价格"
						name="price"
						rules={[
							{ required: true, message: '请输入商品价格' },
							{
								type: 'number',
								min: 0,
								message: '价格不能为负数',
							},
						]}
					>
						<InputNumber
							className="w-full"
							placeholder="请输入商品价格"
							precision={2}
							min={0}
							step={1}
						/>
					</Form.Item>

					<Form.Item
						label="商品库存"
						name="stock"
						rules={[
							{ required: true, message: '请输入商品库存' },
							{
								type: 'number',
								min: 0,
								message: '库存不能为负数',
							},
						]}
					>
						<InputNumber
							className="w-full"
							placeholder="请输入商品库存"
							min={0}
							step={1}
						/>
					</Form.Item>

					<Form.Item label="商品分类" name="category">
						<Select placeholder="请选择商品分类">
							{productCategories.map((category) => (
								<Option key={category} value={category}>
									{category}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item label="商品单位" name="unit">
						<Input placeholder="请输入商品单位（如：瓶、袋、盒等）" />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};

export default ProductsPage;
