/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Typography, Button, Avatar } from 'antd';
import {
	ShoppingCartOutlined,
	DatabaseOutlined,
	BarChartOutlined,
	ShoppingOutlined,
	TagOutlined,
	SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '@/assets/website.png';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

const SiderCollapsedStorageKey = 'sider_collapsed';

interface LayoutProps {
	children: React.ReactNode;
}

const AppLayout: React.FC<LayoutProps> = ({ children }) => {
	const navigate = useNavigate();
	const location = useLocation();

	const [collapsed, setCollapsed] = useState(
		localStorage.getItem(SiderCollapsedStorageKey) === 'true'
	);

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
		// {
		// 	key: '/settings',
		// 	icon: <SettingOutlined />,
		// 	label: '系统设置',
		// },
	];

	// 处理菜单点击
	const handleMenuClick = (e: any) => {
		navigate(e.key);
	};

	return (
		<AntLayout className="h-screen flex flex-col">
			{/* 顶部导航栏 */}
			<Header className="flex items-center justify-between bg-white shadow-sm px-6 pl-2">
				<div className="flex items-center">
					<Avatar src={Logo} size={66} />
					<Title level={4} className="!m-0">
						好客来超市
					</Title>
				</div>
				<div className="flex items-center">
					<Button
						type="text"
						icon={<SettingOutlined />}
						onClick={() => navigate('/settings')}
						className="text-gray-700"
					>
						设置
					</Button>
				</div>
			</Header>
			<AntLayout className="bg-gray-100 flex-1 h-0 flex">
				{/* 侧边栏菜单 */}
				<Sider
					width={200}
					theme="light"
					className="shadow-sm"
					// breakpoint="lg"
					// collapsedWidth="0"
					collapsible
					collapsed={collapsed}
					onCollapse={(value) => {
						localStorage.setItem(
							SiderCollapsedStorageKey,
							JSON.stringify(value)
						);
						setCollapsed(value);
					}}
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
				<Content className="flex-1 w-0 h-full p-6 overflow-auto">
					{children}
				</Content>
			</AntLayout>
		</AntLayout>
	);
};

export default AppLayout;
