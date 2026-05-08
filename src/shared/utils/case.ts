export const toCamelCase = <T>(obj: any): T => {
	if (Array.isArray(obj)) {
		return obj.map((item) => toCamelCase(item)) as unknown as T;
	} else if (obj && typeof obj === "object") {
		return Object.entries(obj).reduce((acc, [key, value]) => {
			const camelKey = key.replace(/_([a-z])/g, (_, char) =>
				char.toUpperCase(),
			);
			acc[camelKey] = toCamelCase(value);
			return acc;
		}, {} as any);
	}
	return obj;
};

export const toSnakeCase = <T>(obj: any): T => {
	if (Array.isArray(obj)) {
		return obj.map((item) => toSnakeCase(item)) as unknown as T;
	} else if (obj && typeof obj === "object") {
		return Object.entries(obj).reduce((acc, [key, value]) => {
			const snakeKey = key.replace(
				/[A-Z]/g,
				(char) => `_${char.toLowerCase()}`,
			);
			acc[snakeKey] = toSnakeCase(value);
			return acc;
		}, {} as any);
	}
	return obj;
};

export const toPascalCase = <T>(obj: any): T => {
	if (Array.isArray(obj)) {
		return obj.map(item => toPascalCase(item)) as unknown as T;
	} else if (obj && typeof obj === "object") {
		return Object.entries(obj).reduce((acc, [key, value]) => {
			// first convert snake_case to camelCase
			const camelKey = key.replace(/_([a-z])/g, (_, char) =>
				char.toUpperCase()
			);
			// then uppercase the first letter to get PascalCase
			const pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1);
			acc[pascalKey] = toPascalCase(value);
			return acc;
		}, {} as any);
	}
	return obj;
};
