#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// Same hash function as in the app
unsigned int hash(const char* str) {
    unsigned int hash = 0;
    int i = 0;
    while (str[i] != '\0') {
        char c = str[i];
        hash = ((hash << 5) - hash) + c;
        hash = hash & hash; // Convert to 32-bit integer
        i++;
    }
    return hash;
}

// Same dictionary as in the app
const char* chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Function to generate validation key from Machine GUID
void generateValidationKey(const char* machineId, char* output) {
    char idPart[17] = {0}; // 16 chars + null terminator
    int j = 0;
    
    // Use first 16 characters, remove hyphens
    for (int i = 0; i < strlen(machineId) && j < 16; i++) {
        if (machineId[i] != '-') {
            idPart[j++] = machineId[i];
        }
    }
    
    // Generate validation key - exactly like JavaScript version
    for (int i = 0; i < 16; i++) {
        // Create string: char + position (like JavaScript: char + i.toString())
        char combined[20];
        sprintf(combined, "%c%d", idPart[i], i);
        
        // Hash and map to dictionary
        unsigned int hashValue = hash(combined);
        int index = hashValue % 36;
        output[i] = chars[index];
    }
    output[16] = '\0'; // Null terminator
}

int main() {
    printf("🔑 Store Management - Key Generator Tool\n");
    printf("=====================================\n\n");
    
    char machineId[100];
    char validationKey[17];
    
    printf("Enter Machine ID: ");
    fgets(machineId, sizeof(machineId), stdin);
    
    // Remove newline character
    machineId[strcspn(machineId, "\n")] = 0;
    
    if (strlen(machineId) < 16) {
        printf("❌ Error: Machine ID must be at least 16 characters.\n");
        return 1;
    }
    
    generateValidationKey(machineId, validationKey);
    
    printf("\n✅ Validation Key: %s\n\n", validationKey);
    printf("Press Enter to exit...");
    getchar();
    
    return 0;
}
