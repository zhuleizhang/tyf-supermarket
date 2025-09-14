export const getNowTimeString = () =>
	new Date().toLocaleString().replace(/[:/\s.]/g, '-');
