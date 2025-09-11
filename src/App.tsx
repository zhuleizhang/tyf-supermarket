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
import { initializeData } from './db/initData';

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

	return (
		<ConfigProvider locale={zhCN}>
			<Router>
				<Routes>
					<Route
						path="/"
						element={<Navigate to="/checkout" replace />}
					/>
					<Route
						path="/checkout"
						element={
							<AppLayout>
								<CheckoutPage />
							</AppLayout>
						}
					/>
					<Route
						path="/products"
						element={
							<AppLayout>
								<ProductsPage />
							</AppLayout>
						}
					/>
					<Route
						path="/statistics"
						element=<AppLayout>
							<StatisticsPage />
						</AppLayout>
					/>
					<Route
						path="/orders"
						element=<AppLayout>
							<OrdersPage />
						</AppLayout>
					/>
				</Routes>
			</Router>
		</ConfigProvider>
	);
}

export default App;
