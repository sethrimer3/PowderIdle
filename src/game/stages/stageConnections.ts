import type { StageConfig, StageConnection } from "./stageTypes";
export function stageConnection(
  config: StageConfig,
  id: string,
): StageConnection {
  const connection = config.connections.find((item) => item.id === id);
  if (!connection) throw new Error(`Missing stage connection ${id}`);
  return connection;
}
