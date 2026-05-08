import { useState } from "react";

export function useModal<T = null>() {
	const [modalData, setModalData] = useState<T | null>(null);
	const openModal = (data: T) => setModalData(data);
	const closeModal = () => setModalData(null);
	return { modalData, openModal, closeModal };
}
