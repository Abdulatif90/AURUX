import {registerEnumType} from "@nestjs/graphql"

export enum MemberType {
    USER = "USER",
    ADMIN = "ADMIN",
    AGENT = "AGENT"
}
registerEnumType(MemberType, {
    name: "MemberType"
})

export enum MemberStatus {
    ACTIVE = "ACTIVE",
    BLOCKED = "BLOCKED",
    DELETED = "DELETED",
}

registerEnumType(MemberStatus, {
    name: "MemberStatus"
})

export enum MemberAuthType {
    PHONE = "PHONE",
    EMAIL = "EMAIL",
    TELEGRAM = "TELEGRAM"
}
registerEnumType(MemberAuthType, {
    name: "MemberAuthType"
})
