import { SlugPage as ClientSlugPage } from "./SlugPage/SlugPage";

export default async function SlugPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<div>
			<ClientSlugPage id={id} />
		</div>
	);
}
