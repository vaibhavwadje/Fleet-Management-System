# ─────────────────────────────────────────────────────────────────────────────
#  FLEMAN - Java Spring Boot backend
#
#  Built FROM SOURCE, on purpose.
#
#  The previous setup copied a hand-built backend-0.0.1-SNAPSHOT.jar into the
#  image. That jar is invisible to anyone reading the repo, silently goes stale
#  the moment someone edits a .java file, and produces exactly the class of bug
#  that is hardest to see - the code says one thing and the running process
#  does another. Building here means the image cannot disagree with the source.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1 : build ──────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Dependencies first, in their own layer. pom.xml changes rarely and source
# changes constantly, so this turns a 3-minute rebuild into a 20-second one.
# go-offline is best-effort: it fails on some plugin resolutions, and failing
# the build over a warm cache would be absurd.
COPY pom.xml .
RUN mvn -B dependency:go-offline -DskipTests || true

COPY src ./src

# Tests are skipped deliberately. They need a live MySQL, which does not exist
# during an image build - the database container is not up yet and could not
# be reached from here if it were. Run them in CI against a real database.
RUN mvn -B clean package -DskipTests

# ── Stage 2 : run ────────────────────────────────────────────────────────────
#
# JRE, not JDK: nothing compiles at runtime, and the JDK image carries a
# compiler, javadoc and the whole tool chain for no reason.
FROM eclipse-temurin:17-jre-alpine

# curl is here only so the compose healthcheck has something to call. Without
# a healthcheck the frontend starts before the API can answer, and the first
# page load fails for no visible reason.
#
# tzdata is not optional. Alpine ships no timezone database, so setting TZ
# without it silently leaves the JVM on UTC. LocalDate.now() and
# LocalDateTime.now() read the default zone, and the hand-over date they
# produce is what billing starts from - a 5.5-hour offset moves rentals across
# day boundaries and changes what people pay.
#
# Note that serverTimezone on the JDBC URL does NOT cover this. That only tells
# the driver how to convert values on the wire; it has no effect on what
# LocalDate.now() returns.
RUN apk add --no-cache curl tzdata

# Overridable from compose. Named here as well so `docker run` on this image
# alone is right by default rather than right only under compose.
ENV TZ=Asia/Kolkata

# Not root. A container process that does not need to write to the filesystem
# should not be able to.
RUN addgroup -S fleman && adduser -S fleman -G fleman

WORKDIR /app

# The wildcard survives a version bump in pom.xml; naming the file explicitly
# would mean this line silently breaking on the next release.
COPY --from=build /build/target/*.jar app.jar

RUN chown -R fleman:fleman /app
USER fleman

EXPOSE 8080

# exec form, so java is PID 1 and receives SIGTERM directly. In shell form the
# signal goes to /bin/sh, java never hears it, and every `docker compose down`
# waits the full 10-second timeout before killing it.
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
