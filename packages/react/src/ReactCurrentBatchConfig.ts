interface BatchConfig {
	transition: number | null;
	layoutEffect: number | null;
}

const ReactCurrentBatchConfig: BatchConfig = {
	transition: null,
	layoutEffect: null
};

export default ReactCurrentBatchConfig;
