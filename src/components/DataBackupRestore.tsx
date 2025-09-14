import React, { useRef, useState } from 'react';
import { Button, message, Modal } from 'antd';
import {
	UploadOutlined,
	DownloadOutlined,
	ExclamationCircleOutlined,
} from '@ant-design/icons';
import { exportData, importData } from '../db';

const { confirm } = Modal;

const DataBackupRestore: React.FC = () => {
	const [uploading, setUploading] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

			{/* 隐藏的文件输入 */}
			<input
				ref={fileInputRef}
				type="file"
				accept=".json"
				onChange={handleFileSelect}
				style={{ display: 'none' }}
			/>
		</div>
	);
};

export default DataBackupRestore;
