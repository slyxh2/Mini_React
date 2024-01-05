const PostsTab = function PostsTab() {
	const items = [];
	for (let i = 0; i < 500; i++) {
		items.push(<SlowPost key={i} index={i} />);
	}
	return <ul className="items">{items}</ul>;
};

function SlowPost({ index }) {
	const startTime = performance.now();
	while (performance.now() - startTime < 4) { }

	return <li className="item">Post #{index + 1}</li>;
}

export default PostsTab;
