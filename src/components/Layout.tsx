/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Layout as AntLayout, Menu, Typography } from 'antd';
import DataBackupRestore from './DataBackupRestore';
import {
	ShoppingCartOutlined,
	DatabaseOutlined,
	BarChartOutlined,
	ShoppingOutlined,
	TagOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
	children: React.ReactNode;
}

const AppLayout: React.FC<LayoutProps> = ({ children }) => {
	const navigate = useNavigate();
	const location = useLocation();

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
			key: '/categories',
			icon: <TagOutlined />,
			label: '分类管理',
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

	return (
		<AntLayout className="min-h-screen">
			{/* 顶部导航栏 */}
			<Header className="flex items-center justify-between bg-white shadow-sm px-6">
				<div className="flex items-center">
					<Title level={4} className="m-0">
						小型超市商品价格管理系统
					</Title>
				</div>
				<div className="flex items-center">
					<DataBackupRestore />
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
