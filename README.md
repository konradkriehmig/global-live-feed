#### Microservices architecture for data integration

<img width="1379" height="619" alt="image" src="https://github.com/user-attachments/assets/a0096e94-79f0-4958-9c44-757f4835be48" />

*all services run in one k8s cluster, only the storage account lies on a dedicated node

#### Simplified architecture for better understanding (reduced to one data source)

<img width="2030" height="1021" alt="image" src="https://github.com/user-attachments/assets/ad35851e-3358-47e4-8781-8d3afdfb8db3" />

#### Further Simplification, only for Spark setup

<img width="636" height="332" alt="image" src="https://github.com/user-attachments/assets/821ba220-f5ff-455a-9ecb-5531f75ff219" />

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
<img width="1732" height="342" alt="image" src="https://github.com/user-attachments/assets/b69efdff-37f9-4777-b7ac-fe4e93a58c95" />

