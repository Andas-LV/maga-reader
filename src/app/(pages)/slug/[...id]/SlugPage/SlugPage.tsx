import React from "react";
import styles from "./SlugPage.module.scss";

interface SlugPageProps {
	id: string;
}

export const SlugPage = ({ id }: SlugPageProps) => {
	return (
		<div className={styles.SlugPage}>
			<h1 className={styles.title}>SlugPage component {id}</h1>
		</div>
	);
};
