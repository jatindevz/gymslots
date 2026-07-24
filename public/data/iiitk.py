import csv

def allocate_slots(input_csv, output_csv):

    # --- Slot capacities (EDIT ONLY HERE) ---
    capacity = {
        "SLOT 1 (5:45 AM TO 7:15 AM)": 35,
        "SLOT 2 (7:15 AM TO 8:45 AM)": 35,
        "SLOT 3 (2:30 PM TO 4:00 PM)": 35,
        "SLOT 4 (4:00PM TO 5:30 PM)": 35,
        "SLOT 5 (5:30 PM TO 7:00 PM)": 20,
        "SLOT 6 (7:00 PM TO 8:30 PM)": 35,
        "SLOT 7 (8:30 PM TO 10:00 PM)": 35,
        "SLOT 8 (10:00PM TO 11:30 PM)": 35,
        
    }

    preference_columns = [f"SLOT PREFERENCE : {i}" for i in range(1, 10)]

    with open(input_csv, newline='', encoding='utf-8') as infile, \
         open(output_csv, 'w', newline='', encoding='utf-8') as outfile:

        reader = csv.DictReader(infile)

        # Ensure Allocated Slot column exists only once
        fieldnames = reader.fieldnames
        if "Allocated Slot" not in fieldnames:
            fieldnames = fieldnames + ["Allocated Slot"]

        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:

            email = row.get("Email", "").strip().lower()
            allocated_slot = None

            # STRICT domain validation
            if not email.endswith("@iiitk.ac.in"):
                row["Allocated Slot"] = "Invalid email domain"
                writer.writerow(row)
                continue

            # Allocate based on preferences
            for pref in preference_columns:
                slot = row.get(pref, "").strip()

                if slot in capacity and capacity[slot] > 0:
                    allocated_slot = slot
                    capacity[slot] -= 1
                    break

            row["Allocated Slot"] = allocated_slot if allocated_slot else "No slot allocated"
            writer.writerow(row)


allocate_slots("GymAccessApplication_MainResponses.csv", "results-new.csv")
