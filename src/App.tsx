import React, { useEffect } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout';
import ProductsPage from './pages/ProductsPage';
import CheckoutPage from './pages/CheckoutPage';
import StatisticsPage from './pages/StatisticsPage';
import OrdersPage from './pages/OrdersPage';
import CategoriesPage from './pages/CategoriesPage';
import SettingsPage from './pages/SettingsPage';
import { initializeData } from './db/initData';
import { useAutoTimeout } from './hooks/useAutoTimeout';
import { useAutoBackup } from './hooks/useAutoBackup.tsx';
import dayjs from 'dayjs';
// 导入dayjs中文locale
import 'dayjs/locale/zh-cn';
// 设置dayjs默认使用中文
dayjs.locale('zh-cn');

// 创建一个包装组件来处理自动超时逻辑，确保在 Router 内部使用
const AutoTimeoutWrapper: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	useAutoTimeout();
	return <>{children}</>;
};

function App() {
	// 初始化数据
	useEffect(() => {
		const init = async () => {
			try {
				await initializeData();
			} catch (error) {
				console.error('初始化数据失败:', error);
			}
		};
		init();
	}, []);

	// 集成自动备份功能
	useAutoBackup();

	return (
		<ConfigProvider locale={zhCN}>
			<Router>
				<AppLayout>
					<AutoTimeoutWrapper>
						<Routes>
							<Route
								path="/"
								element={<Navigate to="/checkout" replace />}
							/>
							<Route
								path="/checkout"
								element={<CheckoutPage />}
							/>
							<Route
								path="/products"
								element={<ProductsPage />}
							/>
							<Route
								path="/categories"
								element={<CategoriesPage />}
							/>
							<Route
								path="/statistics"
								element={<StatisticsPage />}
							/>
							<Route path="/orders" element={<OrdersPage />} />
							<Route
								path="/settings"
								element={<SettingsPage />}
							/>
						</Routes>
					</AutoTimeoutWrapper>
				</AppLayout>
			</Router>
		</ConfigProvider>
	);
}

export default App;
