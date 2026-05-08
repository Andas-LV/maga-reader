import React from "react";
import styles from "./TemplateName.module.scss";

interface TemplateNameProps {}

export const TemplateName = ({}: TemplateNameProps) => {
	return (
		<div className={styles.TemplateName}>
			<h1>TemplateName component</h1>
		</div>
	);
};
