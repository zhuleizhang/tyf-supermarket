export const getNowTimeString = () =>
	new Date().toLocaleString().replace(/[:/\s.]/g, '-');

export const logToFile: typeof window.electron.logToFile = (...data) => {
	return window.electron.logToFile(data);
};
