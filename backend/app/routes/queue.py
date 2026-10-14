from datetime import date, datetime

from flask import Blueprint, request

from sqlalchemy import and_, or_

from app import db

from app.models.appointment import Appointment

from app.models.appointment_slot import AppointmentSlot

from app.models.consultation import Consultation

from app.models.doctor import Doctor

from app.models.patient import Patient

from app.models.queue_token import QueueToken

from app.models.user import User

from app.utils.auth import (

    role_required,

    token_required,

)

queue_bp = Blueprint(

    "queue",

    __name__,

    url_prefix="/api/queue"

)

# ============================================================

# DOCTOR - GET TODAY'S CHECKED-IN QUEUE

# ============================================================



@queue_bp.route(

    "/today",

    methods=["GET"]

)

@token_required

@role_required("doctor")

def get_today_queue():

    """

    Get today's checked-in queue for logged-in doctor

    ---

    tags:

      - Queue

    security:

      - Bearer: []

    responses:

      200:

        description: Queue retrieved successfully

      401:

        description: Unauthorized

      403:

        description: Doctor access required

      404:

        description: Doctor profile not found

    """



    user_id = request.user[

        "user_id"

    ]





    doctor = Doctor.query.filter_by(

        user_id=user_id

    ).first()





    if not doctor:

        return {

            "message":

                "Doctor profile not found",

            "status":

                "error"

        }, 404





    today = date.today()





    # --------------------------------------------------------

    # ONLY CHECKED-IN PATIENTS

    #

    # Priority:

    # urgent first

    # then token number

    # --------------------------------------------------------



    queue = (

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

            .isnot(None)

        )

        .order_by(

            QueueToken.priority.desc(),

            QueueToken.token_number.asc()

        )

        .all()

    )





    result = []





    for token in queue:



        # ----------------------------------------------------

        # PATIENT

        # ----------------------------------------------------



        patient = db.session.get(

            Patient,

            token.patient_id

        )





        patient_user = None





        if patient and patient.user_id:

            patient_user = db.session.get(

                User,

                patient.user_id

            )





        # ----------------------------------------------------

        # APPOINTMENT

        # ----------------------------------------------------



        appointment = db.session.get(

            Appointment,

            token.appointment_id

        )





        # ----------------------------------------------------

        # SLOT

        #

        # Emergency walk-ins have slot_id = NULL.

        # ----------------------------------------------------



        slot = None





        if (

            appointment

            and appointment.slot_id

        ):

            slot = db.session.get(

                AppointmentSlot,

                appointment.slot_id

            )





        result.append({

            "id":

                token.id,



            "appointment_id":

                token.appointment_id,



            "token_number":

                token.token_number,



            "patient_id":

                token.patient_id,



            "patient_name": (

                patient.display_name

                if patient

                else None

            ),



            "patient_contact": (

                patient.contact

                if patient

                else None

            ),



            "priority":

                token.priority,



            "status":

                token.status,



            "appointment_status": (

                appointment.status

                if appointment

                else None

            ),



            "appointment_type": (

                appointment.appointment_type

                if appointment

                else None

            ),



            "booking_source": (

                appointment.booking_source

                if appointment

                else None

            ),



            "emergency_reason": (

                appointment.notes

                if (

                    appointment

                    and appointment.booking_source

                    == "walk_in"

                )

                else None

            ),



            "notes": (

                appointment.notes

                if appointment

                else None

            ),



            "appointment_date": (

                appointment

                .appointment_date

                .isoformat()

                if appointment

                else None

            ),



            "slot_id": (

                appointment.slot_id

                if appointment

                else None

            ),



            "start_time": (

                slot.start_time.strftime(

                    "%H:%M"

                )

                if slot

                else None

            ),



            "end_time": (

                slot.end_time.strftime(

                    "%H:%M"

                )

                if slot

                else None

            ),



            "checked_in": bool(

                token.check_in_time

            ),



            "check_in_time": (

                token.check_in_time

                .isoformat()

                if token.check_in_time

                else None

            ),



            "called_at": (

                token.called_at

                .isoformat()

                if token.called_at

                else None

            ),



            "consultation_started_at": (

                token

                .consultation_started_at

                .isoformat()

                if token

                .consultation_started_at

                else None

            ),



            "completed_at": (

                token.completed_at

                .isoformat()

                if token.completed_at

                else None

            ),

        })





    return {

        "message":

            "Queue retrieved successfully",



        "status":

            "success",



        "date":

            today.isoformat(),



        "count":

            len(result),



        "queue":

            result

    }, 200





# ============================================================

# PATIENT - GET OWN QUEUE STATUS

# ============================================================



@queue_bp.route(

    "/my",

    methods=["GET"]

)

@token_required

@role_required("patient")

def get_my_queue_status():

    """

    Get logged-in patient's active queue status

    ---

    tags:

      - Queue

    security:

      - Bearer: []

    responses:

      200:

        description: Queue status retrieved successfully

      401:

        description: Unauthorized

      403:

        description: Patient access required

      404:

        description: Patient profile not found

    """



    user_id = request.user[

        "user_id"

    ]





    patient = Patient.query.filter_by(

        user_id=user_id

    ).first()





    if not patient:

        return {

            "message":

                "Patient profile not found",



            "status":

                "error"

        }, 404





    today = date.today()





    # --------------------------------------------------------

    # OUTER JOIN

    #

    # Scheduled appointments have slots.

    # Emergency walk-ins have slot_id = NULL.

    # --------------------------------------------------------



    appointment = (

        Appointment.query

        .outerjoin(

            AppointmentSlot,

            Appointment.slot_id

            == AppointmentSlot.id

        )

        .filter(

            Appointment.patient_id

            == patient.id,



            Appointment.appointment_date

            >= today,



            Appointment.status.in_([

                "pending",

                "confirmed",

                "in_progress",

            ])

        )

        .order_by(

            Appointment

            .appointment_date

            .asc(),



            AppointmentSlot

            .start_time

            .asc(),



            Appointment

            .created_at

            .asc()

        )

        .first()

    )





    if not appointment:

        return {

            "message":

                "No active appointment found",



            "status":

                "success",



            "appointment":

                None,



            "queue":

                None

        }, 200





    # --------------------------------------------------------

    # DOCTOR

    # --------------------------------------------------------



    doctor = db.session.get(

        Doctor,

        appointment.doctor_id

    )





    doctor_user = None





    if doctor:

        doctor_user = db.session.get(

            User,

            doctor.user_id

        )





    # --------------------------------------------------------

    # SLOT

    # --------------------------------------------------------



    slot = None





    if appointment.slot_id:

        slot = db.session.get(

            AppointmentSlot,

            appointment.slot_id

        )





    # --------------------------------------------------------

    # QUEUE

    # --------------------------------------------------------



    queue = (

        QueueToken.query

        .filter_by(

            appointment_id=

                appointment.id

        )

        .first()

    )





    appointment_info = {

        "id":

            appointment.id,



        "doctor_id":

            appointment.doctor_id,



        "doctor_name": (

            doctor_user.name

            if doctor_user

            else None

        ),



        "specialization": (

            doctor.specialization

            if doctor

            else None

        ),



        "room_number": (

            doctor.room_number

            if doctor

            else None

        ),



        "appointment_date":

            appointment

            .appointment_date

            .isoformat(),



        "slot_id":

            appointment.slot_id,



        "appointment_time": (

            slot.start_time.strftime(

                "%H:%M"

            )

            if slot

            else None

        ),



        "appointment_end_time": (

            slot.end_time.strftime(

                "%H:%M"

            )

            if slot

            else None

        ),



        "appointment_type":

            appointment.appointment_type,



        "booking_source":

            appointment.booking_source,



        "emergency_reason": (

            appointment.notes

            if appointment.booking_source

            == "walk_in"

            else None

        ),



        "status":

            appointment.status,

    }





    if not queue:

        return {

            "message": (

                "Queue token not found "

                "for appointment"

            ),



            "status":

                "success",



            "appointment":

                appointment_info,



            "queue":

                None

        }, 200





    is_today = (

        appointment.appointment_date

        == today

    )





    checked_in = bool(

        queue.check_in_time

    )





    people_ahead = None

    now_serving = None





    # --------------------------------------------------------

    # LIVE QUEUE INFO

    # --------------------------------------------------------



    if (

        is_today

        and checked_in

    ):



        # ----------------------------------------------------

        # PRIORITY-AWARE PEOPLE AHEAD

        #

        # If current patient is urgent:

        # only earlier urgent patients are ahead.

        #

        # If current patient is normal:

        # all urgent patients + earlier normal patients

        # are ahead.

        # ----------------------------------------------------



        base_ahead_filters = [

            QueueToken.doctor_id

            == queue.doctor_id,



            Appointment.appointment_date

            == today,



            QueueToken.check_in_time

            .isnot(None),



            QueueToken.status.in_([

                "waiting",

                "called",

                "in_consultation",

            ])

        ]





        if queue.priority == "urgent":



            priority_filter = and_(

                QueueToken.priority

                == "urgent",



                QueueToken.token_number

                < queue.token_number

            )



        else:



            priority_filter = or_(

                QueueToken.priority

                == "urgent",



                and_(

                    QueueToken.priority

                    == "normal",



                    QueueToken.token_number

                    < queue.token_number

                )

            )





        people_ahead = (

            QueueToken.query

            .join(

                Appointment,

                QueueToken.appointment_id

                == Appointment.id

            )

            .filter(

                *base_ahead_filters,

                priority_filter

            )

            .count()

        )





        current_queue = (

            QueueToken.query

            .join(

                Appointment,

                QueueToken.appointment_id

                == Appointment.id

            )

            .filter(

                QueueToken.doctor_id

                == queue.doctor_id,



                Appointment.appointment_date

                == today,



                QueueToken.check_in_time

                .isnot(None),



                QueueToken.status.in_([

                    "called",

                    "in_consultation",

                ])

            )

            .order_by(

                QueueToken.priority.desc(),

                QueueToken.token_number.asc()

            )

            .first()

        )





        if current_queue:

            now_serving = (

                current_queue

                .token_number

            )





    queue_info = {

        "id":

            queue.id,



        "token_number":

            queue.token_number,



        "status":

            queue.status,



        "priority":

            queue.priority,



        "queue_active": (

            is_today

            and checked_in

        ),



        "checked_in":

            checked_in,



        "people_ahead":

            people_ahead,



        "now_serving":

            now_serving,



        "check_in_time": (

            queue.check_in_time

            .isoformat()

            if queue.check_in_time

            else None

        ),



        "called_at": (

            queue.called_at

            .isoformat()

            if queue.called_at

            else None

        ),



        "consultation_started_at": (

            queue

            .consultation_started_at

            .isoformat()

            if queue

            .consultation_started_at

            else None

        ),



        "completed_at": (

            queue.completed_at

            .isoformat()

            if queue.completed_at

            else None

        ),

    }





    return {

        "message":

            "Queue status retrieved successfully",



        "status":

            "success",



        "appointment":

            appointment_info,



        "queue":

            queue_info

    }, 200





# ============================================================

# DOCTOR - CALL NEXT PATIENT

# ============================================================



@queue_bp.route(

    "/call-next",

    methods=["POST"]

)

@token_required

@role_required("doctor")

def call_next():

    """

    Call next checked-in patient

    ---

    tags:

      - Queue

    security:

      - Bearer: []

    responses:

      200:

        description: Next patient called successfully

      400:

        description: Doctor already has an active patient

      401:

        description: Unauthorized

      403:

        description: Doctor access required

      404:

        description: No checked-in patient waiting

      500:

        description: Failed to call next patient

    """



    user_id = request.user[

        "user_id"

    ]





    doctor = Doctor.query.filter_by(

        user_id=user_id

    ).first()





    if not doctor:

        return {

            "message":

                "Doctor profile not found",



            "status":

                "error"

        }, 404





    today = date.today()





    # --------------------------------------------------------

    # DO NOT ALLOW MULTIPLE ACTIVE PATIENTS

    # --------------------------------------------------------



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



            QueueToken.status.in_([

                "called",

                "in_consultation",

            ])

        )

        .first()

    )





    if current:

        return {

            "message": (

                "Please complete the "

                "current patient first"

            ),



            "status":

                "error"

        }, 400





    # --------------------------------------------------------

    # NEXT PATIENT

    #

    # Urgent checked-in patients are selected before normal.

    # Among same priority, lowest token comes first.

    # --------------------------------------------------------



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

                "confirmed",

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





    if not next_patient:

        return {

            "message": (

                "No checked-in patients "

                "are waiting today"

            ),



            "status":

                "error"

        }, 404





    appointment = db.session.get(

        Appointment,

        next_patient.appointment_id

    )





    patient = db.session.get(

        Patient,

        next_patient.patient_id

    )





    patient_user = None





    if patient and patient.user_id:

        patient_user = db.session.get(

            User,

            patient.user_id

        )





    try:



        next_patient.status = (

            "called"

        )



        next_patient.called_at = (

            datetime.utcnow()

        )





        db.session.commit()





        return {

            "message":

                "Next patient called successfully",



            "status":

                "success",



            "date":

                today.isoformat(),



            "queue_id":

                next_patient.id,



            "token_number":

                next_patient.token_number,



            "priority":

                next_patient.priority,



            "patient_id":

                next_patient.patient_id,



            "patient_name": (

                patient.display_name

                if patient

                else None

            ),



            "appointment_id":

                next_patient.appointment_id,



            "booking_source": (

                appointment.booking_source

                if appointment

                else None

            ),



            "emergency_reason": (

                appointment.notes

                if (

                    appointment

                    and appointment.booking_source

                    == "walk_in"

                )

                else None

            ),



            "queue_status":

                next_patient.status

        }, 200





    except Exception:



        db.session.rollback()



        return {

            "message":

                "Failed to call next patient",



            "status":

                "error"

        }, 500





# ============================================================

# DOCTOR - START CONSULTATION

# ============================================================



@queue_bp.route(

    "/<int:queue_id>/start",

    methods=["PATCH"]

)

@token_required

@role_required("doctor")

def start_consultation(

    queue_id

):

    """

    Start consultation for a called patient

    ---

    tags:

      - Queue

    security:

      - Bearer: []

    parameters:

      - in: path

        name: queue_id

        type: integer

        required: true

    responses:

      200:

        description: Consultation started successfully

      400:

        description: Patient cannot start consultation

      401:

        description: Unauthorized

      403:

        description: Access denied

      404:

        description: Queue token or appointment not found

      500:

        description: Failed to start consultation

    """



    user_id = request.user[

        "user_id"

    ]





    doctor = Doctor.query.filter_by(

        user_id=user_id

    ).first()





    if not doctor:

        return {

            "message":

                "Doctor profile not found",



            "status":

                "error"

        }, 404





    queue = db.session.get(

        QueueToken,

        queue_id

    )





    if not queue:

        return {

            "message":

                "Queue token not found",



            "status":

                "error"

        }, 404





    if (

        queue.doctor_id

        != doctor.id

    ):

        return {

            "message":

                "Access denied",



            "status":

                "error"

        }, 403





    appointment = db.session.get(

        Appointment,

        queue.appointment_id

    )





    if not appointment:

        return {

            "message":

                "Appointment not found",



            "status":

                "error"

        }, 404





    if (

        appointment.appointment_date

        != date.today()

    ):

        return {

            "message": (

                "Only today's appointment "

                "can be started"

            ),



            "status":

                "error"

        }, 400





    if not queue.check_in_time:

        return {

            "message":

                "Patient must be checked in first",



            "status":

                "error"

        }, 400





    if (

        queue.status

        != "called"

    ):

        return {

            "message": (

                "Only a called patient can "

                "start consultation"

            ),



            "status":

                "error"

        }, 400





    if appointment.status not in [

        "pending",

        "confirmed",

    ]:

        return {

            "message": (

                "This appointment cannot "

                "start consultation"

            ),



            "status":

                "error"

        }, 400





    try:



        started_at = (

            datetime.utcnow()

        )





        queue.status = (

            "in_consultation"

        )





        queue.consultation_started_at = (

            started_at

        )





        appointment.status = (

            "in_progress"

        )





        db.session.commit()





        return {

            "message":

                "Consultation started successfully",



            "status":

                "success",



            "queue_id":

                queue.id,



            "appointment_id":

                appointment.id,



            "booking_source":

                appointment.booking_source,



            "priority":

                queue.priority,



            "queue_status":

                queue.status,



            "appointment_status":

                appointment.status

        }, 200





    except Exception:



        db.session.rollback()



        return {

            "message":

                "Failed to start consultation",



            "status":

                "error"

        }, 500





# ============================================================

# DOCTOR - COMPLETE CONSULTATION

# ============================================================



@queue_bp.route(

    "/<int:queue_id>/complete",

    methods=["PATCH"]

)

@token_required

@role_required("doctor")

def complete_queue(

    queue_id

):

    """

    Complete consultation for current patient

    ---

    tags:

      - Queue

    security:

      - Bearer: []

    parameters:

      - in: path

        name: queue_id

        type: integer

        required: true

    responses:

      200:

        description: Patient consultation completed

      400:

        description: Consultation cannot be completed

      401:

        description: Unauthorized

      403:

        description: Access denied

      404:

        description: Queue token or appointment not found

      500:

        description: Failed to complete consultation

    """



    user_id = request.user[

        "user_id"

    ]





    doctor = Doctor.query.filter_by(

        user_id=user_id

    ).first()





    if not doctor:

        return {

            "message":

                "Doctor profile not found",



            "status":

                "error"

        }, 404





    queue = db.session.get(

        QueueToken,

        queue_id

    )





    if not queue:

        return {

            "message":

                "Queue token not found",



            "status":

                "error"

        }, 404





    if (

        queue.doctor_id

        != doctor.id

    ):

        return {

            "message":

                "Access denied",



            "status":

                "error"

        }, 403





    appointment = db.session.get(

        Appointment,

        queue.appointment_id

    )





    if not appointment:

        return {

            "message":

                "Appointment not found",



            "status":

                "error"

        }, 404





    if (

        appointment.appointment_date

        != date.today()

    ):

        return {

            "message": (

                "Only today's appointment "

                "can be completed"

            ),



            "status":

                "error"

        }, 400





    if (

        queue.status

        != "in_consultation"

    ):

        return {

            "message": (

                "Patient is not currently "

                "in consultation"

            ),



            "status":

                "error"

        }, 400





    if (

        appointment.status

        != "in_progress"

    ):

        return {

            "message": (

                "Appointment is not "

                "currently in progress"

            ),



            "status":

                "error"

        }, 400





    # --------------------------------------------------------

    # CONSULTATION RECORD MUST EXIST

    # --------------------------------------------------------



    consultation = (

        Consultation.query

        .filter_by(

            appointment_id=

                appointment.id

        )

        .first()

    )





    if not consultation:

        return {

            "message": (

                "Please save consultation "

                "details before completing "

                "the patient"

            ),



            "status":

                "error"

        }, 400





    try:



        completed_at = (

            datetime.utcnow()

        )





        queue.status = (

            "completed"

        )





        queue.completed_at = (

            completed_at

        )





        appointment.status = (

            "completed"

        )





        consultation.ended_at = (

            completed_at

        )





        if consultation.started_at:



            duration_seconds = (

                consultation.ended_at

                - consultation.started_at

            ).total_seconds()





            consultation.duration_minutes = round(

                duration_seconds / 60,

                2

            )





        db.session.commit()





        return {

            "message":

                "Patient consultation completed",



            "status":

                "success",



            "queue_id":

                queue.id,



            "appointment_id":

                appointment.id,



            "booking_source":

                appointment.booking_source,



            "queue_status":

                queue.status,



            "appointment_status":

                appointment.status

        }, 200





    except Exception:



        db.session.rollback()



        return {

            "message":

                "Failed to complete consultation",



            "status":

                "error"

        }, 500





# ============================================================

# DOCTOR - SKIP / NO SHOW

# ============================================================



@queue_bp.route(

    "/<int:queue_id>/skip",

    methods=["PATCH"]

)

@token_required

@role_required("doctor")

def skip_queue(

    queue_id

):

    """

    Skip patient or mark patient as no-show

    ---

    tags:

      - Queue

    security:

      - Bearer: []

    parameters:

      - in: path

        name: queue_id

        type: integer

        required: true

    responses:

      200:

        description: Patient skipped successfully

      400:

        description: Patient cannot be skipped

      401:

        description: Unauthorized

      403:

        description: Access denied

      404:

        description: Queue token or appointment not found

      500:

        description: Failed to skip patient

    """



    user_id = request.user[

        "user_id"

    ]





    doctor = Doctor.query.filter_by(

        user_id=user_id

    ).first()





    if not doctor:

        return {

            "message":

                "Doctor profile not found",



            "status":

                "error"

        }, 404





    queue = db.session.get(

        QueueToken,

        queue_id

    )





    if not queue:

        return {

            "message":

                "Queue token not found",



            "status":

                "error"

        }, 404





    if (

        queue.doctor_id

        != doctor.id

    ):

        return {

            "message":

                "Access denied",



            "status":

                "error"

        }, 403





    appointment = db.session.get(

        Appointment,

        queue.appointment_id

    )





    if not appointment:

        return {

            "message":

                "Appointment not found",



            "status":

                "error"

        }, 404





    if (

        appointment.appointment_date

        != date.today()

    ):

        return {

            "message":

                "Only today's patient can be skipped",



            "status":

                "error"

        }, 400





    if (

        queue.status

        not in [

            "waiting",

            "called",

        ]

    ):

        return {

            "message":

                "This patient cannot be skipped",



            "status":

                "error"

        }, 400





    if (

        appointment.status

        not in [

            "pending",

            "confirmed",

        ]

    ):

        return {

            "message": (

                "This appointment cannot "

                "be marked as no-show"

            ),



            "status":

                "error"

        }, 400





    try:



        queue.status = (

            "skipped"

        )





        appointment.status = (

            "no_show"

        )





        db.session.commit()





        return {

            "message":

                "Patient skipped successfully",



            "status":

                "success",



            "queue_id":

                queue.id,



            "appointment_id":

                appointment.id,



            "booking_source":

                appointment.booking_source,



            "queue_status":

                queue.status,



            "appointment_status":

                appointment.status

        }, 200





    except Exception:



        db.session.rollback()



        return {

            "message":

                "Failed to skip patient",



            "status":

                "error"

        }, 500