/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
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
	InputRef,
} from 'antd';
import {
	PlusOutlined,
	SearchOutlined,
	DeleteOutlined,
	EditOutlined,
} from '@ant-design/icons';
import {
	productService,
	categoryService,
	type Product,
	type Category,
} from '../db';
import { useDebounceFn } from 'ahooks';
import Page from '@/components/Page';
import { UNCATEGORIZED_OPTION } from '@/constants';
import { ColumnsType } from 'antd/es/table';
import { getProductListRequest, SortOrder } from '@/db/types';
import { TableProps } from 'antd/lib';

const { Option } = Select;
const { Search } = Input;

const ProductsPage: React.FC = () => {
	const [products, setProducts] = useState<Product[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(10);

	const barcodeAndNameInputRef = useRef<InputRef>(null);

	// 分类相关状态
	const [categories, setCategories] = useState<Category[]>([]);
	const [categoryMap, setCategoryMap] = useState<Map<string, string>>(
		new Map()
	);
	// 分类查询状态
	const [selectedCategory, setSelectedCategory] = useState<string>(undefined);
	const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
	const [sortBy, setSortBy] = useState<string>('updatedAt');

	// 模态框状态
	const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
	const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
	const [modalTitle, setModalTitle] = useState<string>('添加商品');

	const [searchKeyword, setSearchKeyword] = useState('');

	// 表单实例
	const [form] = Form.useForm();

	// 加载分类列表
	const loadCategories = async () => {
		try {
			const categoryList = await categoryService.getAll();
			setCategories(categoryList);

			// 创建分类ID到名称的映射，用于快速查找
			const map = new Map<string, string>();
			categoryList.forEach((category) => {
				map.set(category.id, category.name);
			});
			setCategoryMap(map);
		} catch (error: any) {
			console.log(error, 'loadCategories error');
			message.error('加载分类列表失败');
		}
	};

	// 初始化加载分类
	useEffect(() => {
		loadCategories();
	}, []);

	// 商品数据加载后，重新加载分类以确保数据一致性
	useEffect(() => {
		if (products.length > 0) {
			loadCategories();
		}
	}, [products.length]);

	useEffect(() => {
		barcodeAndNameInputRef.current.focus();
	}, []);

	// 加载商品列表
	const loadProducts = async (request: getProductListRequest) => {
		setLoading(true);
		try {
			const result = await productService.getProductList(request);
			setProducts(result.list);
			setTotal(result.total);
		} catch (error: any) {
			console.log(error, 'loadProducts error');
			message.error('加载商品列表失败');
		} finally {
			setLoading(false);
		}
	};

	// 处理分类选择变化
	const handleCategoryChange = (value: string) => {
		setSelectedCategory(value);
		setCurrentPage(1); // 选择分类时重置到第一页
	};

	// 处理表格排序变化
	const handleTableChange: TableProps<Product>['onChange'] = (
		pagination,
		filters,
		sorter
	) => {
		if (!Array.isArray(sorter)) {
			const sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
			setSortOrder(sortOrder);
			setSortBy(sorter.field as string);
		}
	};

	// 初始化加载
	useEffect(() => {
		loadProducts({
			page: currentPage,
			pageSize,
			keyword: searchKeyword,
			category_id: selectedCategory,
			sortBy,
			sortOrder,
		});
	}, [
		currentPage,
		pageSize,
		searchKeyword,
		selectedCategory,
		sortOrder,
		sortBy,
	]);

	// 处理搜索
	const handleSearch = (value: string) => {
		setSearchKeyword(value);
		setCurrentPage(1); // 搜索时重置到第一页
	};

	const { run: handleSearchDebounced } = useDebounceFn(handleSearch, {
		wait: 300,
	});

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
			category_id: product.category_id,
			unit: product.unit || '',
		});
		setIsModalVisible(true);
	};

	// 处理提交表单
	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();
			let newPage = currentPage;

			if (currentProduct) {
				// 更新商品
				await productService.update(currentProduct.id, values);
				message.success('商品更新成功');
			} else {
				// 添加商品
				await productService.add(values);
				message.success('商品添加成功');
				newPage = 1;
			}

			// 关闭模态框并刷新列表
			setIsModalVisible(false);
			loadProducts({
				page: newPage,
				pageSize,
				keyword: searchKeyword,
				category_id: selectedCategory,
				sortBy,
				sortOrder,
			});
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
						loadProducts({
							page: currentPage,
							pageSize,
							keyword: searchKeyword,
							category_id: selectedCategory,
							sortBy,
							sortOrder,
						});
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
	const columns: ColumnsType<Product> = [
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
			title: '单价',
			dataIndex: 'price',
			key: 'price',
			width: 100,
			render: (price: number) => `¥${price.toFixed(2)}`,
		},

		{
			title: '分类',
			dataIndex: 'category_id',
			key: 'category_id',
			width: 100,
			render: (categoryId?: string) =>
				categoryId ? (
					<Tag color="blue">
						{categoryMap.get(categoryId) || '未知分类'}
					</Tag>
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
			title: '更新时间',
			dataIndex: 'updatedAt',
			key: 'updatedAt',
			width: 150,
			sorter: true,
			sortDirections: ['descend', 'ascend'],
			defaultSortOrder: 'descend',
			render: (updatedAt: string) => {
				const date = new Date(updatedAt);
				return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
			},
		},
		{
			title: '创建时间',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 150,
			sorter: true,
			render: (createdAt: string) => {
				const date = new Date(createdAt);
				return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
			},
		},
		{
			title: '操作',
			key: 'action',
			width: 200,
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
		<Page>
			<div className="flex justify-between items-center mb-4">
				<h1 className="text-xl font-bold">商品管理</h1>
				<div className="flex gap-2">
					<Search
						placeholder="搜索商品名称或条码"
						allowClear
						ref={barcodeAndNameInputRef}
						enterButton={<SearchOutlined />}
						onSearch={handleSearch}
						style={{ width: 300 }}
						onChange={(e) => handleSearchDebounced(e.target.value)}
					/>
					<Select
						placeholder="请选择分类"
						style={{ width: 180 }}
						value={selectedCategory}
						onChange={handleCategoryChange}
						allowClear
					>
						{categories.map((category) => (
							<Option key={category.id} value={category.id}>
								{category.name}
							</Option>
						))}
						<Option
							key={UNCATEGORIZED_OPTION.id}
							value={UNCATEGORIZED_OPTION.id}
						>
							{UNCATEGORIZED_OPTION.name}
						</Option>
					</Select>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={showAddModal}
					>
						添加商品
					</Button>
				</div>
			</div>

			<Table<Product>
				columns={columns}
				dataSource={products}
				rowKey="id"
				loading={loading}
				onChange={handleTableChange}
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
						// price: 0,
						unit: '个',
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
							addonBefore="¥"
							placeholder="请输入商品价格"
							precision={2}
							min={0}
							step={1}
						/>
					</Form.Item>

					<Form.Item label="商品分类" name="category_id">
						<Select placeholder="请选择商品分类" allowClear>
							{categories.map((category) => (
								<Option key={category.id} value={category.id}>
									{category.name}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item label="商品单位" name="unit">
						<Input placeholder="请输入商品单位（如：瓶、袋、盒等）" />
					</Form.Item>
				</Form>
			</Modal>
		</Page>
	);
};

export default ProductsPage;
