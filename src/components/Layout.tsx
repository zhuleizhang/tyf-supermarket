import React from 'react';
import { Layout as AntLayout, Menu, Typography, Input } from 'antd';
import {
	ShoppingCartOutlined,
	DatabaseOutlined,
	BarChartOutlined,
	SearchOutlined,
	ShoppingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;
const { Search } = Input;

interface LayoutProps {
	children: React.ReactNode;
}

const AppLayout: React.FC<LayoutProps> = ({ children }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const { searchKeyword, setSearchKeyword } = useAppStore();

	// 菜单项配置
	const menuItems = [
		{
			key: '/checkout',
			icon: <ShoppingCartOutlined />,
			label: '收银结算',
		},
		{
			key: '/products',
			icon: <DatabaseOutlined />,
			label: '商品管理',
		},
		{
			key: '/orders',
			icon: <ShoppingOutlined />,
			label: '订单管理',
		},
		{
			key: '/statistics',
			icon: <BarChartOutlined />,
			label: '销售统计',
		},
	];

	// 处理菜单点击
	const handleMenuClick = (e: any) => {
		navigate(e.key);
	};

	// 处理全局搜索
	const handleSearch = (value: string) => {
		setSearchKeyword(value);
		// 可以根据需要跳转到特定页面进行搜索结果展示
		if (value && !location.pathname.includes('/products')) {
			navigate('/products');
		}
	};

	return (
		<AntLayout className="min-h-screen">
			{/* 顶部导航栏 */}
			<Header className="flex items-center justify-between bg-white shadow-sm px-6">
				<div className="flex items-center">
					<Title level={4} className="m-0 text-red-600">
						小型超市商品价格管理系统
					</Title>
				</div>
				<div className="w-64">
					<Search
						placeholder="全局搜索商品"
						allowClear
						enterButton={<SearchOutlined />}
						size="middle"
						value={searchKeyword}
						onChange={(e) => setSearchKeyword(e.target.value)}
						onSearch={handleSearch}
					/>
				</div>
			</Header>
			<AntLayout className="bg-gray-100">
				{/* 侧边栏菜单 */}
				<Sider
					width={200}
					theme="light"
					className="shadow-sm"
					breakpoint="lg"
					collapsedWidth="0"
				>
					<Menu
						mode="inline"
						selectedKeys={[location.pathname]}
						onClick={handleMenuClick}
						items={menuItems}
						className="border-r-0"
						style={{ height: '100%', borderRight: 0 }}
					/>
				</Sider>
				{/* 主内容区域 */}
				<Content className="p-6">{children}</Content>
			</AntLayout>
		</AntLayout>
	);
};

export default AppLayout;
