.PHONY: export

OUTPUT_FILE := z_project_list/listing.txt

export:
	@mkdir -p $(dir $(OUTPUT_FILE))
	@echo "=== PROJECT FILE DUMP (excluding binary/image files) ===" > $(OUTPUT_FILE)
	@echo >> $(OUTPUT_FILE)
	@find . \
		-path "./.git" -prune -o \
		-path "./z_project_list" -prune -o \
		-type f -print \
	| sort | while read file; do \
		case "$$file" in \
			*.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.svg) \
				echo "[SKIP CONTENT] $$file" >> $(OUTPUT_FILE);; \
			*) \
				echo "===== $$file =====" >> $(OUTPUT_FILE); \
				cat "$$file" >> $(OUTPUT_FILE); \
				echo >> $(OUTPUT_FILE); \
				echo >> $(OUTPUT_FILE);; \
		esac; \
	done
	@echo "Export completed: $(OUTPUT_FILE)"
