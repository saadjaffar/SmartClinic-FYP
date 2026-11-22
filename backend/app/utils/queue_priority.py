from sqlalchemy import case


def queue_priority_rank(priority_column):
    return case(
        (priority_column == "critical", 0),
        (priority_column == "urgent", 1),
        else_=2,
    )
