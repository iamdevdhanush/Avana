import heapq
from typing import Dict, List, Tuple, Optional

def dijkstra(
    graph: Dict[int, List[Tuple[int, float]]], start: int
) -> Tuple[Dict[int, float], Dict[int, Optional[int]]]:
    """
    Dijkstra's shortest path algorithm.

    Parameters:
        graph: adjacency list where graph[u] = [(v, weight), ...]
        start: source node

    Returns:
        distances: dict mapping node -> shortest distance from start
        predecessors: dict mapping node -> previous node in shortest path
    """
    # Initialize distances with infinity, and predecessors with None
    distances = {node: float('inf') for node in graph}
    predecessors = {node: None for node in graph}
    distances[start] = 0

    # Priority queue: (current_distance, node)
    pq = [(0, start)]

    while pq:
        current_dist, u = heapq.heappop(pq)

        # Skip outdated entries
        if current_dist > distances[u]:
            continue

        # Relax edges from u
        for v, weight in graph[u]:
            new_dist = current_dist + weight
            if new_dist < distances[v]:
                distances[v] = new_dist
                predecessors[v] = u
                heapq.heappush(pq, (new_dist, v))

    return distances, predecessors


def reconstruct_path(predecessors: Dict[int, Optional[int]], target: int) -> List[int]:
    """Reconstruct shortest path from start to target using predecessors."""
    path = []
    node = target
    while node is not None:
        path.append(node)
        node = predecessors[node]
    return path[::-1]  # reverse to get start -> target


# Example usage
if __name__ == "__main__":
    # Graph as adjacency list (directed example)
    # Node 0 -> (1, 4), (2, 1)
    # Node 1 -> (3, 1)
    # Node 2 -> (1, 2), (3, 5)
    # Node 3 -> (4, 3)
    # Node 4 -> (empty)
    graph = {
        0: [(1, 4), (2, 1)],
        1: [(3, 1)],
        2: [(1, 2), (3, 5)],
        3: [(4, 3)],
        4: []
    }

    start_node = 0
    dist, pred = dijkstra(graph, start_node)

    print("Shortest distances from node", start_node)
    for node in sorted(dist):
        print(f"  to {node}: {dist[node]}")

    # Show path to a specific target
    target = 4
    path = reconstruct_path(pred, target)
    print(f"\nShortest path from {start_node} to {target}: {path}")