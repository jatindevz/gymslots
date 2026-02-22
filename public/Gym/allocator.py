import csv

def allocate_slots(input_csv, output_csv):
    # Define slot capacities
    capacity = {
        "SLOT 1 (5:30AM TO 7:00 AM)": 5,
        "SLOT 2 (7:00AM TO 8:30AM)": 7,
        "SLOT 3 (4:00PM TO 5:30PM)": 12,
        "SLOT 4 (5:30PM TO 7:00PM)": 5,
        "SLOT 5 (7:00PM TO 8:30PM)": 0
        
    }

    with open(input_csv, newline='', encoding='utf-8') as infile, \
         open(output_csv, 'w', newline='', encoding='utf-8') as outfile:

        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames + ["Allocated Slot"]
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            allocated_slot = None

            # Check each preference in order
            for pref_key in ["SLOT PREFERENCE : 1", "SLOT PREFERENCE : 2", "SLOT PREFERENCE : 3"]:
                slot = row[pref_key]
                if slot in capacity and capacity[slot] > 0:
                    allocated_slot = slot
                    capacity[slot] -= 1
                    break

            row["Allocated Slot"] = allocated_slot if allocated_slot else "No slot allocated"
            writer.writerow(row)


allocate_slots("GymAccessApplications(Responses).csv", "results_Jan-Feb.csv")

# GymAccessApplication(Responses)-FormResponses.csv