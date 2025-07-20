#!/bin/bash

# =============================================================================
# DIGIPANK DATABASE BACKUP AND RESTORE SCRIPTS
# =============================================================================
# This script provides automated backup and restore functionality

# Configuration
DB_CONTAINER="Mariadb-container"
DB_NAME="mydb"
DB_USER="root"
DB_PASSWORD="123"
BACKUP_DIR="./backups"
DATE_FORMAT=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# =============================================================================
# BACKUP FUNCTIONS
# =============================================================================

# Full database backup (structure + data)
backup_full() {
    echo -e "${YELLOW}Creating full backup...${NC}"
    
    BACKUP_FILE="$BACKUP_DIR/digipank_full_backup_$DATE_FORMAT.sql"
    
    docker exec $DB_CONTAINER mysqldump \
        -u $DB_USER \
        -p$DB_PASSWORD \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-table \
        --add-locks \
        --disable-keys \
        --extended-insert \
        $DB_NAME > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Full backup created: $BACKUP_FILE${NC}"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        echo -e "${GREEN}Backup compressed: $BACKUP_FILE.gz${NC}"
        
        # Show file size
        ls -lh "$BACKUP_FILE.gz"
    else
        echo -e "${RED}Backup failed!${NC}"
        exit 1
    fi
}

# Structure only backup (no data)
backup_structure() {
    echo -e "${YELLOW}Creating structure-only backup...${NC}"
    
    BACKUP_FILE="$BACKUP_DIR/digipank_structure_$DATE_FORMAT.sql"
    
    docker exec $DB_CONTAINER mysqldump \
        -u $DB_USER \
        -p$DB_PASSWORD \
        --no-data \
        --routines \
        --triggers \
        --events \
        $DB_NAME > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Structure backup created: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}Structure backup failed!${NC}"
        exit 1
    fi
}

# Data only backup (no structure)
backup_data() {
    echo -e "${YELLOW}Creating data-only backup...${NC}"
    
    BACKUP_FILE="$BACKUP_DIR/digipank_data_$DATE_FORMAT.sql"
    
    docker exec $DB_CONTAINER mysqldump \
        -u $DB_USER \
        -p$DB_PASSWORD \
        --no-create-info \
        --single-transaction \
        --add-locks \
        --disable-keys \
        --extended-insert \
        $DB_NAME > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Data backup created: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}Data backup failed!${NC}"
        exit 1
    fi
}

# Specific tables backup
backup_tables() {
    local tables="$1"
    echo -e "${YELLOW}Creating backup for tables: $tables${NC}"
    
    BACKUP_FILE="$BACKUP_DIR/digipank_tables_$(echo $tables | tr ' ' '_')_$DATE_FORMAT.sql"
    
    docker exec $DB_CONTAINER mysqldump \
        -u $DB_USER \
        -p$DB_PASSWORD \
        --single-transaction \
        $DB_NAME $tables > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Tables backup created: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}Tables backup failed!${NC}"
        exit 1
    fi
}

# =============================================================================
# RESTORE FUNCTIONS
# =============================================================================

# Restore from backup file
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Backup file not found: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Restoring from: $backup_file${NC}"
    echo -e "${RED}WARNING: This will overwrite existing data!${NC}"
    
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Check if file is compressed
        if [[ "$backup_file" == *.gz ]]; then
            echo -e "${YELLOW}Decompressing and restoring...${NC}"
            gunzip -c "$backup_file" | docker exec -i $DB_CONTAINER mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME
        else
            echo -e "${YELLOW}Restoring...${NC}"
            docker exec -i $DB_CONTAINER mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < "$backup_file"
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Restore completed successfully!${NC}"
        else
            echo -e "${RED}Restore failed!${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Restore cancelled.${NC}"
    fi
}

# =============================================================================
# MAINTENANCE FUNCTIONS
# =============================================================================

# Clean old backups (keep last N days)
cleanup_backups() {
    local days="${1:-7}"  # Default 7 days
    
    echo -e "${YELLOW}Cleaning backups older than $days days...${NC}"
    
    find "$BACKUP_DIR" -name "digipank_*.sql*" -type f -mtime +$days -print
    
    read -p "Delete these files? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        find "$BACKUP_DIR" -name "digipank_*.sql*" -type f -mtime +$days -delete
        echo -e "${GREEN}Old backups cleaned!${NC}"
    else
        echo -e "${YELLOW}Cleanup cancelled.${NC}"
    fi
}

# List available backups
list_backups() {
    echo -e "${YELLOW}Available backups:${NC}"
    ls -lht "$BACKUP_DIR"/digipank_*.sql* 2>/dev/null | head -20
}

# =============================================================================
# AUTOMATED BACKUP FUNCTION
# =============================================================================

# Daily automated backup (for cron)
automated_backup() {
    echo "$(date): Starting automated backup..." >> "$BACKUP_DIR/backup.log"
    
    # Create full backup
    backup_full >> "$BACKUP_DIR/backup.log" 2>&1
    
    # Clean backups older than 30 days
    find "$BACKUP_DIR" -name "digipank_*.sql.gz" -type f -mtime +30 -delete
    
    echo "$(date): Automated backup completed" >> "$BACKUP_DIR/backup.log"
}

# =============================================================================
# MAIN SCRIPT LOGIC
# =============================================================================

case "$1" in
    "full")
        backup_full
        ;;
    "structure")
        backup_structure
        ;;
    "data")
        backup_data
        ;;
    "tables")
        if [ -z "$2" ]; then
            echo -e "${RED}Usage: $0 tables 'table1 table2 table3'${NC}"
            exit 1
        fi
        backup_tables "$2"
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo -e "${RED}Usage: $0 restore <backup_file>${NC}"
            exit 1
        fi
        restore_backup "$2"
        ;;
    "cleanup")
        cleanup_backups "$2"
        ;;
    "list")
        list_backups
        ;;
    "auto")
        automated_backup
        ;;
    *)
        echo -e "${YELLOW}Digipank Database Backup & Restore Tool${NC}"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  full                    - Create full backup (structure + data)"
        echo "  structure              - Create structure-only backup"
        echo "  data                   - Create data-only backup"
        echo "  tables 'table1 table2' - Backup specific tables"
        echo "  restore <file>         - Restore from backup file"
        echo "  cleanup [days]         - Clean backups older than N days (default: 7)"
        echo "  list                   - List available backups"
        echo "  auto                   - Automated backup (for cron jobs)"
        echo ""
        echo "Examples:"
        echo "  $0 full"
        echo "  $0 tables 'users accounts transactions'"
        echo "  $0 restore backups/digipank_full_backup_20250720_150000.sql.gz"
        echo "  $0 cleanup 14"
        echo ""
        ;;
esac
