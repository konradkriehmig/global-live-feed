#### Microservices architecture for data integration

<img width="1798" height="795" alt="image" src="https://github.com/user-attachments/assets/ba0acd9d-6b53-45c4-9510-a6a1160b8b9e" />

*all services run in one k8s cluster, only the storage account lies on a dedicated node

#### Spark Setup

Workflow:
<img width="1674" height="799" alt="image" src="https://github.com/user-attachments/assets/bdaaca6c-1c6f-4daa-9008-097d20f30da5" />

Spark internal Mechanism:
<img width="1289" height="638" alt="image" src="https://github.com/user-attachments/assets/702a8cc8-909e-429e-aee7-bd272183cfa5" />


#### Data processing with DuckDB and Spark (monolithic vs distributed approach):

1. Generated 180GB of notional prometheus-style machine metrics using random walk
2. Transform tests with DuckDB to make a case for distributed data processing with Spark
<img width="1715" height="950" alt="image" src="https://github.com/user-attachments/assets/3390ee28-be4b-4f57-8913-6c06eb017045" />
Tested JSON to parquet transform with DuckDb on 1 core (aborted), 6 cores (aborted), and 12 cores (completed after 316.1s). Monolith VM running DuckDB is already in same DC with storage account and therefore network optimized. Disk spillage was disabled for these three runs. After transform, 15GB of parquet remained.

Sidemark: Network traffic and speed of memory utilization behaved differently under different core utilization (explanations welcomed):
<img width="1722" height="332" alt="image" src="https://github.com/user-attachments/assets/26ad6d28-f85f-473e-896b-c6d9938c0d5f" />


