"use client";

import { useRef, useState } from "react";

const SPEEDS = [0.5, 0.67, 0.75, 1, 1.25, 1.5, 2];

type Props = { url: string; name: string };

export function AudioPlayer({ url, name }: Props) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [speed, setSpeed] = useState(1);

	const changeSpeed = (s: number) => {
		setSpeed(s);
		if (audioRef.current) audioRef.current.playbackRate = s;
	};

	return (
		<div className="flex h-full flex-col items-center justify-center gap-6 p-8">
			<div className="text-5xl">🎵</div>
			<p className="max-w-md truncate text-center text-sm text-zinc-300">
				{name}
			</p>
			<audio
				ref={audioRef}
				controls
				src={url}
				className="w-full max-w-xl"
				onLoadedMetadata={() => {
					if (audioRef.current) audioRef.current.playbackRate = speed;
				}}
			/>
			<div className="flex items-center gap-2">
				<span className="text-sm text-zinc-500">Скорость:</span>
				{SPEEDS.map((s) => (
					<button
						key={s}
						onClick={() => changeSpeed(s)}
						className={`rounded px-2.5 py-1 text-sm transition-colors ${
							speed === s
								? "bg-blue-600 text-white"
								: "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
						}`}
					>
						{s}×
					</button>
				))}
			</div>
		</div>
	);
}
