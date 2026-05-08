"use client";

import type React from "react";
import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./input.module.scss";

export interface CustomInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	label?: string;
	required?: boolean;
	error?: string;
	helperText?: string;
	type?: "text" | "email" | "password" | "number" | "tel" | "url";
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
	(
		{
			label,
			required,
			error,
			helperText,
			type = "text",
			className,
			value,
			...props
		},
		ref,
	) => {
		const [showPassword, setShowPassword] = useState(false);
		const [inputType, setInputType] = useState(type);

		const togglePasswordVisibility = () => {
			setShowPassword(!showPassword);
			setInputType(showPassword ? "password" : "text");
		};

		const isPasswordType = type === "password";
		const hasValue = value !== undefined && value !== null && value !== "";

		return (
			<div className={styles.inputWrapper}>
				<div className={styles.inputContainer}>
					<input
						ref={ref}
						type={isPasswordType ? inputType : type}
						className={`
              ${styles.inputField} 
              ${isPasswordType ? styles.hasPasswordToggle : ""} 
              ${error ? styles.hasError : ""} 
              ${className || ""}
            `}
						value={value}
						placeholder=" "
						{...props}
					/>

					{label && (
						<label
							className={`
                ${styles.floatingLabel} 
                ${hasValue ? styles.active : ""} 
                ${error ? styles.hasError : ""}
              `}
							htmlFor={props.id}
						>
							{label}
							{required && <span className={styles.required}>*</span>}
						</label>
					)}

					{isPasswordType && (
						<button
							type="button"
							className={styles.eyeButton}
							onClick={togglePasswordVisibility}
							aria-label={showPassword ? "Hide password" : "Show password"}
						>
							{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
						</button>
					)}
				</div>

				{error && <div className={styles.errorMessage}>{error}</div>}
				{helperText && !error && (
					<div className={styles.helperText}>{helperText}</div>
				)}
			</div>
		);
	},
);

export default CustomInput;
