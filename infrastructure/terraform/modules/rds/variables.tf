variable "name_prefix"              { type = string }
variable "db_name"                  { type = string }
variable "db_username"              { type = string }
variable "db_password"              { type = string; sensitive = true }
variable "db_instance_class"        { type = string }
variable "db_allocated_storage"     { type = number }
variable "db_max_allocated_storage" { type = number }
variable "db_multi_az"              { type = bool }
variable "db_backup_retention_days" { type = number }
variable "private_subnet_ids"       { type = list(string) }
variable "rds_security_group_id"    { type = string }
