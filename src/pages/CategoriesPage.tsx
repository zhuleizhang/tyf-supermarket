/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Modal, Form, message, Tag } from 'antd';
import {
	PlusOutlined,
	EditOutlined,
	DeleteOutlined,
	SearchOutlined,
} from '@ant-design/icons';
import type { Category } from '../db';
import { categoryService } from '../db';
import Page from '@/components/Page';

const { Search } = Input;

const CategoriesPage: React.FC = () => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
	const [currentCategory, setCurrentCategory] = useState<Category | null>(
		null
	);
	const [modalTitle, setModalTitle] = useState<string>('添加分类');
	const [form] = Form.useForm();
	const [searchKeyword, setSearchKeyword] = useState<string>('');

	// 加载分类列表 - 使用 useCallback 避免每次渲染重新创建
	const loadCategories = useCallback(async () => {
		setLoading(true);
		try {
			const allCategories = await categoryService.getAll();

			// 应用搜索过滤
			if (searchKeyword) {
				const filtered = allCategories.filter((category) =>
					category.name
						.toLowerCase()
						.includes(searchKeyword.toLowerCase())
				);
				setCategories(filtered);
			} else {
				setCategories(allCategories);
			}
		} catch (error: any) {
			console.log(error, 'loadCategories error');

			message.error('加载分类列表失败');
		} finally {
			setLoading(false);
		}
	}, [searchKeyword]);

	// 初始化加载
	useEffect(() => {
		loadCategories();
	}, [searchKeyword, loadCategories]);

	// 处理搜索
	const handleSearch = (value: string) => {
		setSearchKeyword(value);
	};

	// 打开添加分类模态框
	const showAddModal = () => {
		setCurrentCategory(null);
		setModalTitle('添加分类');
		form.resetFields();
		setIsModalVisible(true);
	};

	// 打开编辑分类模态框
	const showEditModal = (category: Category) => {
		setCurrentCategory(category);
		setModalTitle('编辑分类');
		form.setFieldsValue({
			name: category.name,
		});
		setIsModalVisible(true);
	};

	// 处理提交表单
	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();

			if (currentCategory) {
				// 更新分类
				await categoryService.update(currentCategory.id, values);
				message.success('分类更新成功');
			} else {
				// 添加分类
				await categoryService.add(values);
				message.success('分类添加成功');
			}

			// 关闭模态框并刷新列表
			setIsModalVisible(false);
			loadCategories();
		} catch (error: any) {
			console.log(error, 'handleSubmit error');
			message.error(currentCategory ? '分类更新失败' : '分类添加失败');
		}
	};

	// 处理删除分类
	const handleDelete = async (categoryId: string, categoryName: string) => {
		Modal.confirm({
			title: '确认删除',
			content: `确定要删除分类 "${categoryName}" 吗？如果有商品使用此分类，将无法删除。`,
			okText: '确认',
			cancelText: '取消',
			onOk: async () => {
				try {
					const success = await categoryService.delete(categoryId);
					if (success) {
						message.success('分类删除成功');
						loadCategories();
					} else {
						message.error('分类删除失败');
					}
				} catch (error) {
					message.error('分类删除失败: ' + (error as Error).message);
				}
			},
		});
	};

	// 表格列定义
	const columns = [
		{
			title: '分类ID',
			dataIndex: 'id',
			key: 'id',
			ellipsis: true,
			width: 200,
		},
		{
			title: '分类名称',
			dataIndex: 'name',
			key: 'name',
			ellipsis: true,
			width: 200,
			render: (name: string) => <Tag color="blue">{name}</Tag>,
		},
		{
			title: '创建时间',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 200,
			render: (createdAt: string) => {
				const date = new Date(createdAt);
				return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
			},
		},
		{
			title: '更新时间',
			dataIndex: 'updatedAt',
			key: 'updatedAt',
			width: 200,
			render: (updatedAt: string) => {
				const date = new Date(updatedAt);
				return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
			},
		},
		{
			title: '操作',
			key: 'action',
			width: 200,
			fixed: 'right' as const,
			render: (_: any, record: Category) => (
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
						onClick={() => handleDelete(record.id, record.name)}
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
				<h1 className="text-xl font-bold text-gray-800 m-0">
					分类管理
				</h1>
				<div className="flex gap-2">
					<Search
						placeholder="搜索分类名称"
						allowClear
						enterButton={<SearchOutlined />}
						size="middle"
						style={{ width: 250 }}
						onSearch={handleSearch}
					/>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={showAddModal}
					>
						添加分类
					</Button>
				</div>
			</div>

			<Table
				columns={columns}
				dataSource={categories}
				rowKey="id"
				loading={loading}
				pagination={{
					pageSize: 10,
					showSizeChanger: true,
					pageSizeOptions: ['10', '20', '50'],
					showTotal: (total) => `共 ${total} 个分类`,
				}}
				scroll={{ x: 800 }}
			/>

			<Modal
				open={isModalVisible}
				title={modalTitle}
				okText="确定"
				cancelText="取消"
				onCancel={() => setIsModalVisible(false)}
				onOk={handleSubmit}
			>
				<Form
					form={form}
					layout="vertical"
					initialValues={{
						name: '',
					}}
				>
					<Form.Item
						name="name"
						label="分类名称"
						rules={[
							{ required: true, message: '请输入分类名称' },
							{ max: 50, message: '分类名称不能超过50个字符' },
						]}
					>
						<Input placeholder="请输入分类名称" />
					</Form.Item>
				</Form>
			</Modal>
		</Page>
	);
};

export default CategoriesPage;
