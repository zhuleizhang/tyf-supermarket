import React, { useRef, useState } from 'react';
import {
	Button,
	message,
	Modal,
	List,
	Typography,
	Space,
	Popconfirm,
	Empty,
} from 'antd';
import {
	UploadOutlined,
	DownloadOutlined,
	ExclamationCircleOutlined,
	DeleteOutlined,
	ClearOutlined,
} from '@ant-design/icons';
import { autoExportData, exportData, importData } from '../db';

const { confirm } = Modal;
const { Text } = Typography;

// 备份文件类型定义
interface BackupFile {
	name: string;
	path: string;
	size: number;
	createdAt: Date;
	modifiedAt: Date;
}

const DataBackupRestore: React.FC = () => {
	const [uploading, setUploading] = useState<boolean>(false);
	const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
	const [showBackupList, setShowBackupList] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 加载备份文件列表
	const loadBackupFiles = async () => {
		if (!window.electron?.listBackupFiles) return;

		try {
			setLoading(true);
			const files = await window.electron.listBackupFiles();
			setBackupFiles(files);
		} catch (error) {
			message.error(
				`获取备份文件列表失败: ${error instanceof Error ? error.message : '未知错误'}`
			);
		} finally {
			setLoading(false);
		}
	};

	// 删除单个备份文件
	const deleteBackupFile = async (filePath: string) => {
		if (!window.electron?.deleteBackupFile) return;

		try {
			await window.electron.deleteBackupFile(filePath);
			message.success('备份文件已删除');
			// 重新加载备份文件列表
			await loadBackupFiles();

			// 检查是否还有备份文件，如果没有，则自动导出一次
			const remainingFiles = await window.electron.listBackupFiles();
			if (remainingFiles.length === 0) {
				await autoExportData();
			}
		} catch (error) {
			message.error(
				`删除备份文件失败: ${error instanceof Error ? error.message : '未知错误'}`
			);
		}
	};

	// 清理所有备份文件
	const cleanAllBackups = () => {
		confirm({
			title: '警告',
			icon: <ExclamationCircleOutlined />,
			content: '此操作将删除所有备份文件，无法恢复，确定要继续吗？',
			onOk: async () => {
				try {
					setLoading(true);
					// 逐个删除所有备份文件
					for (const file of backupFiles) {
						await window.electron.deleteBackupFile(file.path);
					}
					message.success('所有备份文件已清理');
					// 重新加载备份文件列表
					await loadBackupFiles();

					// 删除所有备份后自动执行一次数据导出
					message.info('正在自动创建新备份...');
					await autoExportData();
				} catch (error) {
					message.error(
						`清理备份文件失败: ${error instanceof Error ? error.message : '未知错误'}`
					);
				} finally {
					setLoading(false);
				}
			},
		});
	};

	// 显示备份文件管理弹窗
	const showBackupManager = async () => {
		await loadBackupFiles();
		setShowBackupList(true);
	};

	// 处理导出数据
	const handleExport = async () => {
		try {
			message.loading('正在准备导出数据...');
			await exportData();
			message.destroy();
			message.success('数据导出成功');
		} catch (error) {
			message.error(
				`导出失败: ${
					error instanceof Error ? error.message : '未知错误'
				}`
			);
		}
	};

	// 处理导入数据
	const handleImport = () => {
		confirm({
			title: '警告',
			icon: <ExclamationCircleOutlined />,
			content: '导入数据将覆盖所有现有数据，确定要继续吗？',
			onOk: () => {
				if (fileInputRef.current) {
					fileInputRef.current.click();
				}
			},
		});
	};

	// 文件选择处理
	const handleFileSelect = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// 重置文件输入，以便可以再次选择同一个文件
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}

		try {
			setUploading(true);
			message.loading('正在导入数据...');
			await importData(file);
			message.destroy();
			message.success('数据导入成功');
		} catch (error) {
			setUploading(false);
			message.error(
				`导入失败: ${error instanceof Error ? error.message : '未知错误'}`
			);
		}
	};

	return (
		<>
			<div className="flex items-center gap-2">
				<Button
					type="primary"
					onClick={handleExport}
					icon={<DownloadOutlined />}
					disabled={uploading}
				>
					导出数据
				</Button>

				<Button
					onClick={handleImport}
					icon={<UploadOutlined />}
					disabled={uploading}
				>
					导入数据
				</Button>

				<Button
					onClick={showBackupManager}
					icon={<ClearOutlined />}
					disabled={uploading}
				>
					备份管理
				</Button>

				{/* 隐藏的文件输入 */}
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					onChange={handleFileSelect}
					style={{ display: 'none' }}
				/>
			</div>

			{/* 备份文件列表弹窗 */}
			<Modal
				title="备份文件管理"
				open={showBackupList}
				onCancel={() => setShowBackupList(false)}
				footer={[
					<Button
						key="refresh"
						onClick={loadBackupFiles}
						loading={loading}
					>
						刷新
					</Button>,
					<Button
						key="cleanAll"
						danger
						onClick={cleanAllBackups}
						disabled={backupFiles.length === 0 || loading}
					>
						清理所有备份
					</Button>,
					<Button
						key="close"
						type="primary"
						onClick={() => setShowBackupList(false)}
					>
						关闭
					</Button>,
				]}
			>
				{backupFiles.length === 0 ? (
					<Empty description="暂无备份文件" />
				) : (
					<List
						className="max-h-[500px] overflow-auto"
						loading={loading}
						dataSource={backupFiles}
						renderItem={(item) => (
							<List.Item
								actions={[
									<Popconfirm
										title="确定要删除此备份文件吗？"
										onConfirm={() =>
											deleteBackupFile(item.path)
										}
										okText="删除"
										cancelText="取消"
									>
										<Button
											type="text"
											danger
											icon={<DeleteOutlined />}
										>
											删除
										</Button>
									</Popconfirm>,
								]}
							>
								<List.Item.Meta
									title={item.name}
									description={
										<Space
											direction="vertical"
											size="small"
										>
											<Text type="secondary">
												大小:{' '}
												{(item.size / 1024).toFixed(2)}{' '}
												KB
											</Text>
											<Text type="secondary">
												创建时间:{' '}
												{new Date(
													item.createdAt
												).toLocaleString()}
											</Text>
										</Space>
									}
								/>
							</List.Item>
						)}
					/>
				)}
			</Modal>
		</>
	);
};

export default DataBackupRestore;
