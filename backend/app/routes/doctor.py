from datetime import date, datetime, timedelta

from flask import Blueprint, request

from app import db
from app.models.appointment import Appointment
from app.models.appointment_slot import AppointmentSlot
from app.models.doctor import Doctor
from app.models.doctor_schedule import DoctorSchedule
from app.models.queue_token import QueueToken
from app.models.user import User
from app.utils.auth import token_required, role_required


doctor_bp = Blueprint(
    "doctor",
    __name__,
    url_prefix="/api/doctors"
)


# ============================================================
# DOCTOR PROFILE - GET
# ============================================================

@doctor_bp.route("/profile", methods=["GET"])
@token_required
@role_required("doctor")
def get_doctor_profile():
    """
    Get own doctor profile
    ---
    tags:
      - Doctor
    security:
      - Bearer: []
    responses:
      200:
        description: Doctor profile retrieved successfully
      404:
        description: Doctor profile not found
      403:
        description: Doctor access required
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    user = db.session.get(
        User,
        user_id
    )

    return {
        "message": "Doctor profile retrieved successfully",
        "status": "success",
        "doctor": {
            "id": doctor.id,
            "user_id": doctor.user_id,
            "name": user.name if user else None,
            "email": user.email if user else None,
            "specialization": doctor.specialization,
            "license_number": doctor.license_number,
            "room_number": doctor.room_number,
            "working_hours": doctor.working_hours,
            "duty_status": doctor.duty_status
        }
    }, 200


# ============================================================
# DOCTOR PROFILE - UPDATE
# ============================================================

@doctor_bp.route("/profile", methods=["PUT"])
@token_required
@role_required("doctor")
def update_doctor_profile():
    """
    Update own doctor profile
    ---
    tags:
      - Doctor
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: doctor
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
              example: Dr. Ahmed Khan
            specialization:
              type: string
              example: Cardiology
            license_number:
              type: string
              example: PMC-12345
            room_number:
              type: string
              example: Room 101
            working_hours:
              type: string
              example: 9 AM - 5 PM
    responses:
      200:
        description: Doctor profile updated successfully
      400:
        description: Invalid request
      404:
        description: Doctor profile not found
      403:
        description: Doctor access required
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    user = db.session.get(
        User,
        user_id
    )

    if not user:
        return {
            "message": "User account not found",
            "status": "error"
        }, 404

    data = request.get_json()

    if not data:
        return {
            "message": "Request body is required",
            "status": "error"
        }, 400

    if "name" in data:
        name = str(
            data["name"]
        ).strip()

        if not name:
            return {
                "message": "Name cannot be empty",
                "status": "error"
            }, 400

        user.name = name

    if "specialization" in data:
        specialization = str(
            data["specialization"]
        ).strip()

        if not specialization:
            return {
                "message": "Specialization cannot be empty",
                "status": "error"
            }, 400

        doctor.specialization = specialization

    if "license_number" in data:
        doctor.license_number = data["license_number"]

    if "room_number" in data:
        doctor.room_number = data["room_number"]

    if "working_hours" in data:
        doctor.working_hours = data["working_hours"]

    try:
        db.session.commit()

        return {
            "message": "Doctor profile updated successfully",
            "status": "success",
            "doctor": {
                "id": doctor.id,
                "user_id": doctor.user_id,
                "name": user.name,
                "email": user.email,
                "specialization": doctor.specialization,
                "license_number": doctor.license_number,
                "room_number": doctor.room_number,
                "working_hours": doctor.working_hours,
                "duty_status": doctor.duty_status
            }
        }, 200

    except Exception:
        db.session.rollback()

        return {
            "message": "Failed to update doctor profile",
            "status": "error"
        }, 500


# ============================================================
# DOCTOR DUTY STATUS
# ============================================================

@doctor_bp.route("/duty", methods=["PATCH"])
@token_required
@role_required("doctor")
def update_duty_status():
    """
    Update doctor duty status
    ---
    tags:
      - Doctor
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: duty
        required: true
        schema:
          type: object
          required:
            - duty_status
          properties:
            duty_status:
              type: string
              example: on_duty
    responses:
      200:
        description: Duty status updated
      400:
        description: Invalid duty status
      404:
        description: Doctor profile not found
      403:
        description: Doctor access required
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    data = request.get_json()

    if not data or "duty_status" not in data:
        return {
            "message": "duty_status is required",
            "status": "error"
        }, 400

    duty_status = data["duty_status"]

    if duty_status not in [
        "on_duty",
        "off_duty"
    ]:
        return {
            "message": (
                "duty_status must be "
                "on_duty or off_duty"
            ),
            "status": "error"
        }, 400

    doctor.duty_status = duty_status

    try:
        db.session.commit()

        return {
            "message": "Duty status updated successfully",
            "status": "success",
            "duty_status": doctor.duty_status
        }, 200

    except Exception:
        db.session.rollback()

        return {
            "message": "Failed to update duty status",
            "status": "error"
        }, 500


# ============================================================
# PATIENT - GET DOCTORS
# ============================================================

@doctor_bp.route("", methods=["GET"])
@token_required
@role_required("patient")
def get_doctors():
    """
    Get available doctors
    ---
    tags:
      - Patient
    security:
      - Bearer: []
    parameters:
      - name: specialization
        in: query
        type: string
        required: false
        example: Cardiology
    responses:
      200:
        description: Doctors retrieved successfully
      403:
        description: Patient access required
    """

    specialization = request.args.get(
        "specialization"
    )

    query = Doctor.query

    if specialization:
        query = query.filter(
            Doctor.specialization.ilike(
                f"%{specialization}%"
            )
        )

    doctors = query.all()

    result = []

    for doctor in doctors:

        user = db.session.get(
            User,
            doctor.user_id
        )

        if not user:
            continue

        if user.status != "active":
            continue

        result.append({
            "id": doctor.id,
            "name": user.name,
            "specialization": doctor.specialization,
            "room_number": doctor.room_number,
            "working_hours": doctor.working_hours,
            "duty_status": doctor.duty_status
        })

    return {
        "message": "Doctors retrieved successfully",
        "status": "success",
        "count": len(result),
        "doctors": result
    }, 200


# ============================================================
# DOCTOR SCHEDULE - GET MY SCHEDULE
# ============================================================

@doctor_bp.route("/schedule", methods=["GET"])
@token_required
@role_required("doctor")
def get_my_schedule():
    """
    Get doctor's weekly schedule
    ---
    tags:
      - Doctor Schedule
    security:
      - Bearer: []
    responses:
      200:
        description: Doctor schedule retrieved successfully
      404:
        description: Doctor profile not found
      403:
        description: Doctor access required
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    day_order = {
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 3,
        "Thursday": 4,
        "Friday": 5,
        "Saturday": 6,
        "Sunday": 7
    }

    schedules = DoctorSchedule.query.filter_by(
        doctor_id=doctor.id,
        is_active=True
    ).all()

    schedules = sorted(
        schedules,
        key=lambda item: day_order.get(
            item.day_of_week,
            99
        )
    )

    result = []

    for schedule in schedules:
        result.append({
            "id": schedule.id,
            "day_of_week": schedule.day_of_week,
            "start_time": schedule.start_time.strftime(
                "%H:%M"
            ),
            "end_time": schedule.end_time.strftime(
                "%H:%M"
            ),
            "slot_duration_minutes": (
                schedule.slot_duration_minutes
            ),
            "is_active": schedule.is_active
        })

    return {
        "message": "Doctor schedule retrieved successfully",
        "status": "success",
        "count": len(result),
        "schedules": result
    }, 200


# ============================================================
# DOCTOR SCHEDULE - UPDATE
# ============================================================

@doctor_bp.route(
    "/schedule/<int:schedule_id>",
    methods=["PUT"]
)
@token_required
@role_required("doctor")
def update_schedule(schedule_id):
    """
    Update doctor weekly schedule
    ---
    tags:
      - Doctor Schedule
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: path
        name: schedule_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - day_of_week
            - start_time
            - end_time
            - slot_duration_minutes
          properties:
            day_of_week:
              type: string
              example: Monday
            start_time:
              type: string
              example: "09:00"
            end_time:
              type: string
              example: "13:00"
            slot_duration_minutes:
              type: integer
              example: 30
    responses:
      200:
        description: Doctor schedule updated successfully
      400:
        description: Invalid request
      404:
        description: Schedule not found
      409:
        description: Active schedule already exists
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    schedule = DoctorSchedule.query.filter_by(
        id=schedule_id,
        doctor_id=doctor.id,
        is_active=True
    ).first()

    if not schedule:
        return {
            "message": "Active schedule not found",
            "status": "error"
        }, 404

    data = request.get_json()

    if not data:
        return {
            "message": "Request body is required",
            "status": "error"
        }, 400

    day = str(
        data.get("day_of_week", "")
    ).strip()

    start = str(
        data.get("start_time", "")
    ).strip()

    end = str(
        data.get("end_time", "")
    ).strip()

    duration = data.get(
        "slot_duration_minutes"
    )

    if (
        not day
        or not start
        or not end
        or duration is None
    ):
        return {
            "message": (
                "day_of_week, start_time, "
                "end_time and "
                "slot_duration_minutes are required"
            ),
            "status": "error"
        }, 400

    valid_days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    ]

    if day not in valid_days:
        return {
            "message": "Invalid day_of_week",
            "status": "error"
        }, 400

    try:
        start_time = datetime.strptime(
            start,
            "%H:%M"
        ).time()

        end_time = datetime.strptime(
            end,
            "%H:%M"
        ).time()

    except ValueError:
        return {
            "message": "Time must use HH:MM format",
            "status": "error"
        }, 400

    try:
        duration = int(duration)

    except (TypeError, ValueError):
        return {
            "message": (
                "Slot duration must be a valid number"
            ),
            "status": "error"
        }, 400

    if duration <= 0:
        return {
            "message": (
                "Slot duration must be greater than zero"
            ),
            "status": "error"
        }, 400

    if end_time <= start_time:
        return {
            "message": (
                "End time must be later than start time"
            ),
            "status": "error"
        }, 400

    start_minutes = (
        start_time.hour * 60
        + start_time.minute
    )

    end_minutes = (
        end_time.hour * 60
        + end_time.minute
    )

    schedule_minutes = (
        end_minutes - start_minutes
    )

    if duration > schedule_minutes:
        return {
            "message": (
                "Slot duration cannot be longer "
                "than the schedule time"
            ),
            "status": "error"
        }, 400

    duplicate_schedule = (
        DoctorSchedule.query
        .filter(
            DoctorSchedule.doctor_id == doctor.id,
            DoctorSchedule.day_of_week == day,
            DoctorSchedule.is_active.is_(True),
            DoctorSchedule.id != schedule.id
        )
        .first()
    )

    if duplicate_schedule:
        return {
            "message": (
                f"An active schedule already "
                f"exists for {day}"
            ),
            "status": "error"
        }, 409

    schedule.day_of_week = day
    schedule.start_time = start_time
    schedule.end_time = end_time
    schedule.slot_duration_minutes = duration

    try:
        db.session.commit()

        return {
            "message": (
                "Doctor schedule updated successfully"
            ),
            "status": "success",
            "schedule": {
                "id": schedule.id,
                "day_of_week": schedule.day_of_week,
                "start_time": (
                    schedule.start_time.strftime(
                        "%H:%M"
                    )
                ),
                "end_time": (
                    schedule.end_time.strftime(
                        "%H:%M"
                    )
                ),
                "slot_duration_minutes": (
                    schedule.slot_duration_minutes
                ),
                "is_active": schedule.is_active
            }
        }, 200

    except Exception:
        db.session.rollback()

        return {
            "message": "Failed to update doctor schedule",
            "status": "error"
        }, 500


# ============================================================
# DOCTOR SCHEDULE - DEACTIVATE
# ============================================================

@doctor_bp.route(
    "/schedule/<int:schedule_id>",
    methods=["DELETE"]
)
@token_required
@role_required("doctor")
def deactivate_schedule(schedule_id):
    """
    Deactivate doctor weekly schedule
    ---
    tags:
      - Doctor Schedule
    security:
      - Bearer: []
    parameters:
      - in: path
        name: schedule_id
        type: integer
        required: true
    responses:
      200:
        description: Doctor schedule deactivated successfully
      404:
        description: Active schedule not found
      403:
        description: Doctor access required
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    schedule = DoctorSchedule.query.filter_by(
        id=schedule_id,
        doctor_id=doctor.id,
        is_active=True
    ).first()

    if not schedule:
        return {
            "message": "Active schedule not found",
            "status": "error"
        }, 404

    schedule.is_active = False

    try:
        db.session.commit()

        return {
            "message": (
                "Doctor schedule deactivated successfully"
            ),
            "status": "success"
        }, 200

    except Exception:
        db.session.rollback()

        return {
            "message": (
                "Failed to deactivate doctor schedule"
            ),
            "status": "error"
        }, 500


# ============================================================
# DOCTOR SCHEDULE - CREATE
# ============================================================

@doctor_bp.route("/schedule", methods=["POST"])
@token_required
@role_required("doctor")
def create_schedule():
    """
    Create doctor weekly schedule
    ---
    tags:
      - Doctor Schedule
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - day_of_week
            - start_time
            - end_time
            - slot_duration_minutes
          properties:
            day_of_week:
              type: string
              example: Monday
            start_time:
              type: string
              example: "09:00"
            end_time:
              type: string
              example: "13:00"
            slot_duration_minutes:
              type: integer
              example: 30
    responses:
      201:
        description: Doctor schedule created successfully
      400:
        description: Invalid request
      401:
        description: Unauthorized
      403:
        description: Doctor access required
      409:
        description: Active schedule already exists
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    data = request.get_json()

    if not data:
        return {
            "message": "Request body is required",
            "status": "error"
        }, 400

    day = str(
        data.get("day_of_week", "")
    ).strip()

    start = str(
        data.get("start_time", "")
    ).strip()

    end = str(
        data.get("end_time", "")
    ).strip()

    duration = data.get(
        "slot_duration_minutes"
    )

    if (
        not day
        or not start
        or not end
        or duration is None
    ):
        return {
            "message": (
                "day_of_week, start_time, "
                "end_time and "
                "slot_duration_minutes are required"
            ),
            "status": "error"
        }, 400

    valid_days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    ]

    if day not in valid_days:
        return {
            "message": "Invalid day_of_week",
            "status": "error"
        }, 400

    try:
        start_time = datetime.strptime(
            start,
            "%H:%M"
        ).time()

        end_time = datetime.strptime(
            end,
            "%H:%M"
        ).time()

    except ValueError:
        return {
            "message": "Time must use HH:MM format",
            "status": "error"
        }, 400

    try:
        duration = int(duration)

    except (TypeError, ValueError):
        return {
            "message": (
                "Slot duration must be "
                "a valid number"
            ),
            "status": "error"
        }, 400

    if duration <= 0:
        return {
            "message": (
                "Slot duration must be "
                "greater than zero"
            ),
            "status": "error"
        }, 400

    if end_time <= start_time:
        return {
            "message": (
                "End time must be later "
                "than start time"
            ),
            "status": "error"
        }, 400

    start_minutes = (
        start_time.hour * 60
        + start_time.minute
    )

    end_minutes = (
        end_time.hour * 60
        + end_time.minute
    )

    schedule_minutes = (
        end_minutes
        - start_minutes
    )

    if duration > schedule_minutes:
        return {
            "message": (
                "Slot duration cannot be "
                "longer than the schedule time"
            ),
            "status": "error"
        }, 400

    existing_schedule = (
        DoctorSchedule.query.filter_by(
            doctor_id=doctor.id,
            day_of_week=day,
            is_active=True
        ).first()
    )

    if existing_schedule:
        return {
            "message": (
                f"An active schedule already "
                f"exists for {day}"
            ),
            "status": "error"
        }, 409

    schedule = DoctorSchedule(
        doctor_id=doctor.id,
        day_of_week=day,
        start_time=start_time,
        end_time=end_time,
        slot_duration_minutes=duration,
        is_active=True
    )

    try:
        db.session.add(schedule)
        db.session.commit()

        return {
            "message": (
                "Doctor schedule created successfully"
            ),
            "status": "success",
            "schedule": {
                "id": schedule.id,
                "day_of_week": schedule.day_of_week,
                "start_time": (
                    schedule.start_time.strftime(
                        "%H:%M"
                    )
                ),
                "end_time": (
                    schedule.end_time.strftime(
                        "%H:%M"
                    )
                ),
                "slot_duration_minutes": (
                    schedule.slot_duration_minutes
                )
            }
        }, 201

    except Exception:
        db.session.rollback()

        return {
            "message": "Failed to create doctor schedule",
            "status": "error"
        }, 500


# ============================================================
# DOCTOR SCHEDULE - GENERATE SLOTS
# ============================================================

@doctor_bp.route(
    "/schedule/generate-slots",
    methods=["POST"]
)
@token_required
@role_required("doctor")
def generate_slots():
    """
    Generate appointment slots for a doctor
    ---
    tags:
      - Doctor Schedule
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - date
          properties:
            date:
              type: string
              format: date
              example: "2026-09-28"
    responses:
      201:
        description: Appointment slots generated successfully
      400:
        description: Invalid or past date
      404:
        description: Schedule not found
      409:
        description: Slots already exist
      401:
        description: Unauthorized
      403:
        description: Doctor access required
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    data = request.get_json()

    if not data:
        return {
            "message": "Request body is required",
            "status": "error"
        }, 400

    date_string = str(
        data.get("date", "")
    ).strip()

    if not date_string:
        return {
            "message": "date is required",
            "status": "error"
        }, 400

    try:
        target_date = datetime.strptime(
            date_string,
            "%Y-%m-%d"
        ).date()

    except ValueError:
        return {
            "message": (
                "Date must use YYYY-MM-DD format"
            ),
            "status": "error"
        }, 400

    # --------------------------------------------------------
    # DO NOT ALLOW PAST DATES
    # --------------------------------------------------------

    today = date.today()

    if target_date < today:
        return {
            "message": (
                "Appointment slots cannot be generated "
                "for a past date"
            ),
            "status": "error"
        }, 400

    # --------------------------------------------------------
    # FIND ACTIVE WEEKLY SCHEDULE
    # --------------------------------------------------------

    day_name = target_date.strftime(
        "%A"
    )

    schedule = DoctorSchedule.query.filter_by(
        doctor_id=doctor.id,
        day_of_week=day_name,
        is_active=True
    ).first()

    if not schedule:
        return {
            "message": (
                "No active schedule found "
                "for this day"
            ),
            "status": "error"
        }, 404

    # --------------------------------------------------------
    # PREVENT DUPLICATE SLOT GENERATION
    # --------------------------------------------------------

    existing_slots = (
        AppointmentSlot.query.filter_by(
            doctor_id=doctor.id,
            slot_date=target_date
        ).count()
    )

    if existing_slots > 0:
        return {
            "message": (
                "Slots already exist for this date"
            ),
            "status": "error"
        }, 409

    # --------------------------------------------------------
    # INITIAL SLOT RANGE
    # --------------------------------------------------------

    current = datetime.combine(
        target_date,
        schedule.start_time
    )

    end_datetime = datetime.combine(
        target_date,
        schedule.end_time
    )

    slot_delta = timedelta(
        minutes=schedule.slot_duration_minutes
    )

    # --------------------------------------------------------
    # TODAY: SKIP TIMES THAT HAVE ALREADY PASSED
    # --------------------------------------------------------

    if target_date == today:

        now = datetime.now()

        while current <= now:
            current += slot_delta

        # No complete future slot remains today
        if (
            current + slot_delta
            > end_datetime
        ):
            return {
                "message": (
                    "No future appointment slots "
                    "remain for today"
                ),
                "status": "error"
            }, 400

    # --------------------------------------------------------
    # CREATE SLOTS
    # --------------------------------------------------------

    created_slots = []

    while (
        current + slot_delta
        <= end_datetime
    ):

        slot_end = (
            current + slot_delta
        )

        slot = AppointmentSlot(
            doctor_id=doctor.id,
            slot_date=target_date,
            start_time=current.time(),
            end_time=slot_end.time(),
            status="available",
            version=1
        )

        db.session.add(slot)

        created_slots.append({
            "start_time": current.strftime(
                "%H:%M"
            ),
            "end_time": slot_end.strftime(
                "%H:%M"
            )
        })

        current = slot_end

    # Extra safety check
    if not created_slots:
        db.session.rollback()

        return {
            "message": (
                "No appointment slots could be "
                "generated for this date"
            ),
            "status": "error"
        }, 400

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        return {
            "message": (
                "Failed to generate appointment slots"
            ),
            "status": "error"
        }, 500

    return {
        "message": (
            "Appointment slots generated successfully"
        ),
        "status": "success",
        "date": target_date.isoformat(),
        "day": day_name,
        "count": len(created_slots),
        "slots": created_slots
    }, 201


# ============================================================
# DOCTOR DASHBOARD
# ============================================================

@doctor_bp.route("/dashboard", methods=["GET"])
@token_required
@role_required("doctor")
def doctor_dashboard():
    """
    Get doctor dashboard
    ---
    tags:
      - Doctor
    security:
      - Bearer: []
    responses:
      200:
        description: Doctor dashboard retrieved successfully
      401:
        description: Unauthorized
      403:
        description: Doctor access required
      404:
        description: Doctor profile not found
    """

    user_id = request.user["user_id"]

    doctor = Doctor.query.filter_by(
        user_id=user_id
    ).first()

    if not doctor:
        return {
            "message": "Doctor profile not found",
            "status": "error"
        }, 404

    user = db.session.get(
        User,
        user_id
    )

    today = date.today()


    # ========================================================
    # TODAY'S APPOINTMENTS
    # ========================================================

    appointments = (
        Appointment.query
        .filter(
            Appointment.doctor_id
            == doctor.id,

            Appointment.appointment_date
            == today
        )
        .all()
    )

    total = len(
        appointments
    )

    completed = sum(
        1
        for appointment in appointments
        if appointment.status
        == "completed"
    )

    cancelled = sum(
        1
        for appointment in appointments
        if appointment.status
        == "cancelled"
    )


    # ========================================================
    # CHECKED-IN WAITING PATIENTS ONLY
    # ========================================================

    waiting = (
        QueueToken.query
        .join(
            Appointment,
            QueueToken.appointment_id
            == Appointment.id
        )
        .filter(
            QueueToken.doctor_id
            == doctor.id,

            Appointment.appointment_date
            == today,

            Appointment.status.in_([
                "pending",
                "confirmed"
            ]),

            QueueToken.status
            == "waiting",

            QueueToken.check_in_time
            .isnot(None)
        )
        .count()
    )


    # ========================================================
    # CURRENT ACTIVE PATIENT
    # ========================================================

    current = (
        QueueToken.query
        .join(
            Appointment,
            QueueToken.appointment_id
            == Appointment.id
        )
        .filter(
            QueueToken.doctor_id
            == doctor.id,

            Appointment.appointment_date
            == today,

            QueueToken.check_in_time
            .isnot(None),

            QueueToken.status.in_([
                "called",
                "in_consultation"
            ])
        )
        .order_by(
            QueueToken
            .token_number
            .asc()
        )
        .first()
    )


    # ========================================================
    # NEXT CHECKED-IN WAITING PATIENT
    # ========================================================

    next_patient = (
        QueueToken.query
        .join(
            Appointment,
            QueueToken.appointment_id
            == Appointment.id
        )
        .filter(
            QueueToken.doctor_id
            == doctor.id,

            Appointment.appointment_date
            == today,

            Appointment.status.in_([
                "pending",
                "confirmed"
            ]),

            QueueToken.status
            == "waiting",

            QueueToken.check_in_time
            .isnot(None)
        )
        .order_by(
            QueueToken.priority.desc(),
            QueueToken.token_number.asc()
        )
        .first()
    )


    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "message": (
            "Doctor dashboard retrieved successfully"
        ),

        "status": "success",

        "doctor": {
            "id": doctor.id,

            "name": (
                user.name
                if user
                else None
            ),

            "specialization":
                doctor.specialization,

            "room_number":
                doctor.room_number,

            "working_hours":
                doctor.working_hours,

            "duty_status":
                doctor.duty_status
        },

        "today": {
            "date":
                today.isoformat(),

            "total_appointments":
                total,

            "completed":
                completed,

            "waiting":
                waiting,

            "cancelled":
                cancelled
        },

        "queue": {
            "current_token": (
                current.token_number
                if current
                else None
            ),

            "current_status": (
                current.status
                if current
                else None
            ),

            "current_queue_id": (
                current.id
                if current
                else None
            ),

            "next_token": (
                next_patient.token_number
                if next_patient
                else None
            ),

            "next_queue_id": (
                next_patient.id
                if next_patient
                else None
            )
        }
    }, 200