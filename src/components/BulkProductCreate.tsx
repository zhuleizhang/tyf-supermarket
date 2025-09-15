/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Button, Upload, message, Table, Typography, Divider } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { productService, categoryService } from '../db';
import type { Product } from '../db';

const { Title, Text } = Typography;

export interface BulkProductData {
	products: Array<{
		name: string;
		barcode: string;
		price: number;
		category_id: string;
		unit: string;
	}>;
}

export interface ImportResult {
	success: number;
	skipped: number;
	successProducts: Product[];
	skippedProducts: Array<{
		product: any;
		reason: string;
	}>;
}

const BulkProductCreate: React.FC = () => {
	const [importing, setImporting] = useState<boolean>(false);
	const [importResult, setImportResult] = useState<ImportResult | null>(null);
	const [fileList, setFileList] = useState<any[]>([]);

	// 上传配置
	const uploadProps: UploadProps = {
		name: 'file',
		accept: '.json',
		fileList,
		beforeUpload: (file) => {
			const isJSON =
				file.type === 'application/json' || file.name.endsWith('.json');
			if (!isJSON) {
				message.error('请上传 JSON 格式的文件！');
				return Upload.LIST_IGNORE;
			}
			setFileList([file]);
			return false; // 阻止默认上传行为，手动处理文件
		},
		onRemove: () => {
			setFileList([]);
			setImportResult(null);
			return true;
		},
		showUploadList: {
			showDownloadIcon: false,
			showPreviewIcon: false,
		},
	};

	// 读取文件内容并处理导入
	const handleImport = async () => {
		if (fileList.length === 0) {
			message.warning('请先选择要导入的 JSON 文件');
			return;
		}

		setImporting(true);
		const file = fileList[0];
		const result: ImportResult = {
			success: 0,
			skipped: 0,
			successProducts: [],
			skippedProducts: [],
		};

		try {
			// 读取文件内容
			const fileContent = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target?.result) {
						resolve(e.target.result as string);
					} else {
						reject(new Error('文件读取失败'));
					}
				};
				reader.onerror = () => reject(new Error('文件读取错误'));
				reader.readAsText(file);
			});

			// 解析 JSON
			const data: BulkProductData = JSON.parse(fileContent);
			if (!data.products || !Array.isArray(data.products)) {
				throw new Error('JSON 格式不正确，缺少 products 数组');
			}

			// 获取所有分类，用于验证分类ID是否存在
			const categories = await categoryService.getAll();
			const categoryIds = new Set(categories.map((cat) => cat.id));

			// 导入每个商品
			for (const productData of data.products) {
				try {
					// 验证必填字段
					if (
						!productData.name ||
						!productData.barcode ||
						!productData.price
					) {
						result.skipped++;
						result.skippedProducts.push({
							product: productData,
							reason: '缺少必填字段（名称、条码、价格）',
						});
						continue;
					}

					// 验证分类是否存在
					if (
						productData.category_id &&
						!categoryIds.has(productData.category_id)
					) {
						result.skipped++;
						result.skippedProducts.push({
							product: productData,
							reason: '分类ID不存在',
						});
						continue;
					}

					// 验证条码是否已存在
					const existingProduct = await productService.getByBarcode(
						productData.barcode
					);
					if (existingProduct) {
						result.skipped++;
						result.skippedProducts.push({
							product: productData,
							reason: '商品条码已存在',
						});
						continue;
					}

					// 创建商品
					const newProduct = await productService.add({
						name: productData.name,
						barcode: productData.barcode,
						price: productData.price || 0,
						category_id: productData.category_id,
						unit: productData.unit,
					});

					result.success++;
					result.successProducts.push(newProduct);
				} catch (error) {
					result.skipped++;
					result.skippedProducts.push({
						product: productData,
						reason:
							error instanceof Error ? error.message : '导入失败',
					});
				}
			}

			message.success(
				`批量导入完成：成功 ${result.success} 个，跳过 ${result.skipped} 个`
			);
			setImportResult(result);
		} catch (error) {
			message.error(error instanceof Error ? error.message : '导入失败');
		} finally {
			setImporting(false);
		}
	};

	// 导出导入结果
	const handleExportResult = () => {
		if (!importResult) {
			message.warning('没有可导出的结果');
			return;
		}

		const exportData = {
			importSummary: {
				totalProducts: importResult.success + importResult.skipped,
				success: importResult.success,
				skipped: importResult.skipped,
				timestamp: new Date().toLocaleString('zh-CN', {
					timeZone: 'Asia/Shanghai',
				}),
			},
			successProducts: importResult.successProducts,
			skippedProducts: importResult.skippedProducts,
		};

		const dataStr = JSON.stringify(exportData, null, 2);
		const dataUri =
			'data:application/json;charset=utf-8,' +
			encodeURIComponent(dataStr);

		const exportFileDefaultName = `商品批量导入结果_${new Date().toISOString().split('T')[0]}.json`;

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', exportFileDefaultName);
		linkElement.click();
	};

	// 成功商品的表格列配置
	const successColumns = [
		{ title: '商品名称', dataIndex: 'name', key: 'name' },
		{ title: '商品条码', dataIndex: 'barcode', key: 'barcode' },
		{ title: '价格', dataIndex: 'price', key: 'price' },
		{ title: '单位', dataIndex: 'unit', key: 'unit' },
		{ title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
	];

	// 跳过商品的表格列配置
	const skippedColumns = [
		{ title: '商品名称', dataIndex: ['product', 'name'], key: 'name' },
		{
			title: '商品条码',
			dataIndex: ['product', 'barcode'],
			key: 'barcode',
		},
		{ title: '跳过原因', dataIndex: 'reason', key: 'reason' },
	];

	return (
		<div className="space-y-4">
			<Text type="secondary">
				请上传包含商品信息的JSON文件，系统将自动验证并创建商品。
				文件格式要求：包含一个名为products的数组，每个商品必须包含name、barcode和price字段。
			</Text>

			<Upload {...uploadProps}>
				<Button icon={<UploadOutlined />} disabled={importing}>
					选择JSON文件
				</Button>
			</Upload>

			<Button
				type="primary"
				onClick={handleImport}
				disabled={importing || fileList.length === 0}
				loading={importing}
			>
				开始导入
			</Button>

			{importResult && (
				<div className="mt-4">
					<Divider />
					<div className="mb-4">
						<Text strong>导入结果：</Text>
						<Text className="ml-2">
							成功 {importResult.success} 个，跳过{' '}
							{importResult.skipped} 个
						</Text>
						<Button
							type="default"
							icon={<DownloadOutlined />}
							onClick={handleExportResult}
							className="ml-4"
						>
							导出结果
						</Button>
					</div>

					{importResult.success > 0 && (
						<div className="mb-4">
							<Title level={5}>成功导入的商品</Title>
							<Table
								columns={successColumns}
								dataSource={importResult.successProducts}
								rowKey="id"
							/>
						</div>
					)}

					{importResult.skipped > 0 && (
						<div>
							<Title level={5}>跳过的商品</Title>
							<Table
								columns={skippedColumns}
								dataSource={importResult.skippedProducts}
								rowKey={(record, index) => index}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default BulkProductCreate;
